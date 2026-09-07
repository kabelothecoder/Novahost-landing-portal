import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Please choose an option to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full"
            variant="default"
          >
            Sign In
          </Button>
          <Button 
            onClick={() => navigate('/register')} 
            className="w-full"
            variant="outline"
          >
            Create Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}