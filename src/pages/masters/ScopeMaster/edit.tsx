import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useCallback, useState } from "react";
import ScopeMasterForm from "../../../components/form/ScopeMasterForm";
import { FormPageWrapper } from "../../../components/layout/PageWrapper";
import { Card, CardContent } from "../../../components/ui/card";
import { ScopeMasterData, useMasterDataStore } from "../../../store/useStore";
import { ScopeMasterFormData } from "../../../lib/validations/schemas";

const ScopeMasterEditPage = () => {
  const { id: scopeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    scopeMasterLoading,
    gaugeMasterList,
    gaugeMasterLoading,
    getScopeMasterById,
    fetchScopeMasterById,
    fetchGaugeMasters,
  } = useMasterDataStore();
  const [hasResolvedScopeMaster, setHasResolvedScopeMaster] = useState(false);

  // Fetch data if not already loaded
  useEffect(() => {
    let isMounted = true;

    const loadScopeMaster = async () => {
      if (!scopeId) {
        if (isMounted) {
          setHasResolvedScopeMaster(true);
        }
        return;
      }

      const existingScopeMaster = getScopeMasterById(scopeId);
      if (existingScopeMaster) {
        if (isMounted) {
          setHasResolvedScopeMaster(true);
        }
        return;
      }

      try {
        await fetchScopeMasterById(scopeId);
      } finally {
        if (isMounted) {
          setHasResolvedScopeMaster(true);
        }
      }
    };

    setHasResolvedScopeMaster(false);
    void loadScopeMaster();

    return () => {
      isMounted = false;
    };
  }, [fetchScopeMasterById, getScopeMasterById, scopeId]);

  useEffect(() => {
    if (gaugeMasterList.length === 0) {
      fetchGaugeMasters();
    }
  }, [fetchGaugeMasters, gaugeMasterList.length]);

  // Redirect if scope not found
  useEffect(() => {
    if (scopeId && hasResolvedScopeMaster && !scopeMasterLoading) {
      const scopeMaster = getScopeMasterById(scopeId);
      if (!scopeMaster) {
        navigate("/masters/scope-master");
      }
    }
  }, [scopeId, hasResolvedScopeMaster, scopeMasterLoading, getScopeMasterById, navigate]);

  const handleFormSuccess = useCallback(() => {
    const returnTo = searchParams.get("returnTo") || "/masters/scope-master";
    navigate(returnTo, {
      state: { fromEdit: true },
      replace: true,
    });
  }, [navigate, searchParams]);

  const mapScopeToForm = (data: ScopeMasterData): ScopeMasterFormData => {
    // Map calibration_location from store type to form type
    let calibrationLocation: "permanent_facility" | "site_facility" | "mobile_facility" = "permanent_facility";
    
    if (data.calibration_location) {
      // Map legacy store values to form values
      if (data.calibration_location === "on_site") {
        calibrationLocation = "site_facility";
      } else if (data.calibration_location === "mobile") {
        calibrationLocation = "mobile_facility";
      } else if (data.calibration_location === "permanent_facility") {
        calibrationLocation = "permanent_facility";
      }
    }

    return {
      master_gauge_id: data.master_gauge_id ?? "",
      range: {
        min:
          data.range?.min !== undefined && data.range?.min !== null
            ? String(data.range.min)
            : "0",
        max:
          data.range?.max !== undefined && data.range?.max !== null
            ? String(data.range.max)
            : "0",
      },
      least_count:
        data.least_count !== undefined && data.least_count !== null
          ? String(data.least_count)
          : "0",
      valid_until: data.valid_until ?? "",
      uncertainty: data.uncertainty ?? "",
      confidence_level_and_coverage: data.confidence_level_and_coverage ?? "",
      calibration_location: calibrationLocation,
      remarks: data.remarks ?? "",
      calibration_equipments: data.calibration_equipments ?? [],
      master_equipments: data.master_equipments ?? [],
    };
  };

  if (scopeMasterLoading || gaugeMasterLoading || !hasResolvedScopeMaster) {
    return (
      <FormPageWrapper
        title="Edit Scope Master"
        description="Update calibration scope definition"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading scope master data...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  if (!scopeId) {
    return (
      <FormPageWrapper
        title="Edit Scope Master"
        description="Update calibration scope definition"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                Scope master ID is required
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  const scopeMaster = getScopeMasterById(scopeId);

  if (!scopeMaster && !scopeMasterLoading) {
    return (
      <FormPageWrapper
        title="Edit Scope Master"
        description="Update calibration scope definition"
      >
        <div className="max-w-5xl mx-auto">
          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                Scope master not found
              </div>
            </CardContent>
          </Card>
        </div>
      </FormPageWrapper>
    );
  }

  return (
    <FormPageWrapper
      title="Edit Scope Master"
      description="Update calibration scope definition"
    >
      <ScopeMasterForm
        mode="edit"
        scopeId={scopeId}
        gaugeMasterList={gaugeMasterList}
        initialData={scopeMaster ? mapScopeToForm(scopeMaster) : undefined}
        onSuccess={handleFormSuccess}
      />
    </FormPageWrapper>
  );
};

export default ScopeMasterEditPage;
