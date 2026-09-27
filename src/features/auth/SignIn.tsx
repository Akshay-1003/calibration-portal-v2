import { useNavigate } from 'react-router';
import AuthPageLayout from './AuthPageLayout';
import SignInForm from './components/SignInForm';

export default function SignIn() {
  const navigate = useNavigate();
  
  const handleSwitchToSignUp = () => {
    navigate('/signup');
  };

  return (
    <AuthPageLayout>
      <SignInForm onSwitchToSignUp={handleSwitchToSignUp} />
    </AuthPageLayout>
  );
}
