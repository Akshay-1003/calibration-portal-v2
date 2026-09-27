import { useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import ScopeMasterForm from "../../../components/form/ScopeMasterForm";
import { useMasterDataStore } from "../../../store/useStore";

const ScopeMasterCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gaugeMasterList, fetchGaugeMasters } = useMasterDataStore();

  useEffect(() => {
    // Only fetch if not already loaded
    if (gaugeMasterList.length === 0) {
      fetchGaugeMasters();
    }
  }, [fetchGaugeMasters, gaugeMasterList.length]);

  const handleFormSuccess = useCallback(() => {
    const returnTo = searchParams.get("returnTo") || "/masters/scope-master";
    navigate(returnTo, {
      state: { fromCreate: true },
      replace: true,
    });
  }, [navigate, searchParams]);

  return (
    <FormPageWrapper
      title="Create Scope Master"
      description="Add new calibration scope definition"
    >
      <ScopeMasterForm
        mode="create"
        gaugeMasterList={gaugeMasterList}
        onSuccess={handleFormSuccess}
      />
    </FormPageWrapper>
  );
};

export default ScopeMasterCreatePage;
