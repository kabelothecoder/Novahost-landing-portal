//+------------------------------------------------------------------+
//|                                     NovaHost_Master_Bridge.mq5   |
//|                                     Copyright 2026, NovaHost     |
//|                                     https://novahost.co          |
//+------------------------------------------------------------------+
#property copyright "NovaHost"
#property link      "https://api.novahost.co"
#property version   "1.00"
#property description "NovaHost Master Bridge - Signal Uploader EA"

input string   InpEAID         = "MASTER_001";          // EA ID
input string   InpAdminKey     = "your-secret-key";     // Admin / NovaHost Key
input string   InpServerURL    = "https://epulmnfbxjmaimefhofp.supabase.co/functions/v1/broadcast-signal"; // Server URL
input bool     InpIsCentAccount = false;                 // Is this a Cent Account?

// File name for persistent history
#define HISTORY_FILE "NovaHost_Signal_History.bin"

// Memory for tracked positions
struct TrackedPosition {
    ulong ticket;
    double sl;
    double tp;
    double price;
    double volume;
};

TrackedPosition trackedPositions[];
ulong historyTickets[];
bool isBusy = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   // Load persistent history from file
   LoadHistory();
   
   EventSetMillisecondTimer(200);
   Print("NovaHost Master Bridge initialized. History Loaded: ", ArraySize(historyTickets), " tickets.");
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Load history from binary file                                    |
//+------------------------------------------------------------------+
void LoadHistory()
  {
   int handle = FileOpen(HISTORY_FILE, FILE_READ|FILE_BIN);
   if(handle != INVALID_HANDLE)
     {
      uint count = (uint)(FileSize(handle) / sizeof(ulong));
      ArrayResize(historyTickets, count);
      for(uint i=0; i<count; i++)
        {
         historyTickets[i] = FileReadLong(handle);
        }
      FileClose(handle);
     }
  }

//+------------------------------------------------------------------+
//| Save history to binary file                                      |
//+------------------------------------------------------------------+
void SaveTicketToHistory(ulong ticket)
  {
   int handle = FileOpen(HISTORY_FILE, FILE_READ|FILE_WRITE|FILE_BIN);
   if(handle != INVALID_HANDLE)
     {
      FileSeek(handle, 0, SEEK_END);
      FileWriteLong(handle, ticket);
      FileClose(handle);
      
      int size = ArraySize(historyTickets);
      ArrayResize(historyTickets, size + 1);
      historyTickets[size] = ticket;
     }
  }

//+------------------------------------------------------------------+
//| Check if ticket is in history                                    |
//+------------------------------------------------------------------+
bool IsInHistory(ulong ticket)
  {
   for(int i=0; i<ArraySize(historyTickets); i++)
     {
      if(historyTickets[i] == ticket) return true;
     }
   return false;
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("NovaHost Master Bridge deinitialized.");
  }

//+------------------------------------------------------------------+
//| Symbol Normalizer Function                                       |
//+------------------------------------------------------------------+
string CleanSymbol(string rawSymbol)
  {
   // Basic cleaning - Backend now handles advanced dynamic mapping
   string clean = rawSymbol;
   int dotPos = StringFind(clean, ".", 0);
   if(dotPos > 0) clean = StringSubstr(clean, 0, dotPos);
   return clean;
  }

//+------------------------------------------------------------------+
//| Find Tracked Position Index                                      |
//+------------------------------------------------------------------+
int FindTrackedPosition(ulong ticket)
  {
   int size = ArraySize(trackedPositions);
   for(int i=0; i<size; i++)
     {
      if(trackedPositions[i].ticket == ticket) return i;
     }
   return -1;
  }

//+------------------------------------------------------------------+
//| Send WebRequest Signal                                           |
//+------------------------------------------------------------------+
void SendSignal(string type, string symbol, double price, double sl, double tp, double volume, ulong ticket)
  {
   if(isBusy) return;
   isBusy = true;

   string cleanSymbol = CleanSymbol(symbol);
   
   // LOT NORMALIZATION (Cent to Standard)
   double lotToSend = InpIsCentAccount ? (volume / 100.0) : volume;
   if(lotToSend < 0.01) lotToSend = 0.01;

   string json = "{";
   json += "\"ea_id\":\"" + InpEAID + "\",";
   json += "\"pair\":\"" + cleanSymbol + "\",";
   json += "\"type\":\"" + type + "\",";
   json += "\"price\":" + DoubleToString(price, 5) + ",";
   json += "\"sl\":" + DoubleToString(sl, 5) + ",";
   json += "\"tp\":" + DoubleToString(tp, 5) + ",";
   json += "\"lot\":" + DoubleToString(lotToSend, 2);
   json += "}";

   char postData[];
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   string headers = "Content-Type: application/json\r\n";
   headers += "X-NovaHost-Key: " + InpAdminKey + "\r\n";
   
   char resultData[];
   string resultHeaders;
   
   // Fixed timeout to 2000ms to allow some breathing room
   int res = WebRequest("POST", InpServerURL, headers, 2000, postData, resultData, resultHeaders);
   
   if(res == 200 || res == 201)
     {
      Print("Signal Broadcast Successfully: ", cleanSymbol, " [", type, "] Ticket: ", ticket);
      if(type != "MODIFY") SaveTicketToHistory(ticket);
     }
   else
     {
      Print("Broadcast Failed. HTTP: ", res, " Error: ", GetLastError());
     }
     
   isBusy = false;
  }

//+------------------------------------------------------------------+
//| Main Spy Logic (Timer Trigger)                                   |
//+------------------------------------------------------------------+
void OnTimer()
  {
   if(isBusy) return;

   int total = PositionsTotal();
   
   for(int i=0; i<total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      double price = PositionGetDouble(POSITION_PRICE_OPEN);
      double volume = PositionGetDouble(POSITION_VOLUME);
      string symbol = PositionGetString(POSITION_SYMBOL);
      long posType = PositionGetInteger(POSITION_TYPE);
      
      string txtType = (posType == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      int index = FindTrackedPosition(ticket);
      
      // NEW TRADE DETECTION
      if(index == -1)
        {
         // CRITICAL AUDIT FIX: Check persistent history before sending
         if(IsInHistory(ticket)) {
             // Position already sent in previous session, just add to volatile tracker
             AddToVolatileTracker(ticket, sl, tp, price, volume);
             continue;
         }

         AddToVolatileTracker(ticket, sl, tp, price, volume);
         Print("Bridge Event: New Master Trade Detected - ", ticket);
         SendSignal(txtType, symbol, price, sl, tp, volume, ticket);
        }
      // MODIFICATION TRACKING
      else
        {
         if(trackedPositions[index].sl != sl || trackedPositions[index].tp != tp)
           {
            trackedPositions[index].sl = sl;
            trackedPositions[index].tp = tp;
            Print("Bridge Event: Position Modificaton Detected - ", ticket);
            SendSignal("MODIFY", symbol, price, sl, tp, volume, ticket);
           }
        }
     }
  }

void AddToVolatileTracker(ulong ticket, double sl, double tp, double price, double volume)
{
    int newSize = ArraySize(trackedPositions) + 1;
    ArrayResize(trackedPositions, newSize);
    trackedPositions[newSize-1].ticket = ticket;
    trackedPositions[newSize-1].sl = sl;
    trackedPositions[newSize-1].tp = tp;
    trackedPositions[newSize-1].price = price;
    trackedPositions[newSize-1].volume = volume;
}
//+------------------------------------------------------------------+
