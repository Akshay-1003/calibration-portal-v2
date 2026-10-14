import { useNavigate } from 'react-router-dom';
import { CustomerTable } from '../../../components/Tables/customerTable';
import { Button } from '../../../components/ui/button';
import { TablePageWrapper } from '../../../components/layout/TablePageWrapper';
import { useAuth } from '../../../features/auth';

const PartyMasterPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isLaboratoryAdmin = hasRole('lab_admin') || hasRole('org_admin');
  const isSuperAdmin = hasRole('super_admin') || hasRole('superadmin');
  const canManageClients = isLaboratoryAdmin || isSuperAdmin;

  return (
    <TablePageWrapper
      title="Client Master List"
      description="Manage your Client Contacts and Details"
      actions={canManageClients ? (
        <Button
          onClick={() => navigate('/masters/party-master/create')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create Client
        </Button>
      ) : undefined}
    >
      <div className="w-full p-2">
        <CustomerTable canManage={canManageClients} />
      </div>
    </TablePageWrapper>
  );
};

export default PartyMasterPage;
