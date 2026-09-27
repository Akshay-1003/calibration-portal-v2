import { useNavigate } from 'react-router';
import AuthPageLayout from './AuthPageLayout';
import { SignUpForm } from './components/SignUpForm';

export default function SignUp() {
  const navigate = useNavigate();
  
  const handleSwitchToSignIn = () => {
    navigate('/signin');
  };

  return (
    <AuthPageLayout>
      <SignUpForm onSwitchToSignIn={handleSwitchToSignIn} />
    </AuthPageLayout>
  );
}
