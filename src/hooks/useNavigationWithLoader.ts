import { useNavigate } from "react-router-dom";
import { useNavigation } from "../context/NavigationContext";
import { useCallback } from "react";

export const useNavigationWithLoader = () => {
  const navigate = useNavigate();
  const { startLoading } = useNavigation();

  const navigateWithLoader = useCallback((path: string) => {
    startLoading(path);
    navigate(path);
  }, [navigate, startLoading]);

  return { navigateWithLoader };
};
