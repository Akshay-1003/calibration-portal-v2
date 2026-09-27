import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { TablePageWrapper } from "../../../components/layout/TablePageWrapper";
import ReadingMasterListTable from "../../../components/Tables/ReadingMasterListTable";
import { useReadingMasterStore } from "../../../store/readingMasterStore";

const ReadingMasterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    items,
    loading,
    error,
    actions: { fetchAll ,deleteReadingMaster},
    
  } = useReadingMasterStore();

  useEffect(() => {
    const navigationState = location.state as
      | { fromCreate?: boolean; fromEdit?: boolean }
      | null;
    const shouldForceRefresh = Boolean(
      navigationState?.fromCreate || navigationState?.fromEdit
    );

    fetchAll(shouldForceRefresh);
  }, [fetchAll, location.state]);

  const handleRefresh = () => {
    fetchAll(true);
  };
const handleDelete = (id: string) => {
  deleteReadingMaster(id);
};
  return (
    <TablePageWrapper
      title="Reading Master"
      description="Manage standard reading values for master gauges"
      actions={
        <Button
          onClick={() => navigate("/masters/reading-master/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create Reading Master
        </Button>
      }
    >
      <div className="p-2">
        <ReadingMasterListTable
          data={items}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
          onDelete={handleDelete}
        />
      </div>
    </TablePageWrapper>
  );
};

export default ReadingMasterPage;
