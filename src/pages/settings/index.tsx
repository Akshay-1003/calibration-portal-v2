import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Tabs } from '@heroui/react';
import {
  UserCircleIcon,
  LockClosedIcon,
  BellIcon,
  UsersIcon,
  ShieldCheckIcon,
  BuildingLibraryIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { SettingsProfile } from './profile';
import { SettingsChangePassword } from './change-password';
import { SettingsNotifications } from './notifications';
import { SettingsUsers } from './users';
import { SettingsRolesPermissions } from './roles-permissions';
import { SettingsAccounts } from './accounts';
import { SettingsLaboratories } from './laboratories';
import { SettingsUploadRecords } from './upload-records';
import { useAuth } from '../../features/auth';
import {
  adminOnlySettingsTabs,
  settingsAdministrationRoles,
  settingsAdministrationTabs,
} from '../../config/access-control';
import { UnauthorizedPage } from '../../features/auth/components/UnauthorizedPage';

const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();
  
  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes('/profile')) return 'profile';
    if (location.pathname.includes('/change-password')) return 'change-password';
    if (location.pathname.includes('/notifications')) return 'notifications';
    if (location.pathname.includes('/appearance')) return 'appearance';
    if (location.pathname.includes('/users')) return 'users';
    if (location.pathname.includes('/roles-permissions')) return 'roles-permissions';
    if (location.pathname.includes('/accounts')) return 'accounts';
    if (location.pathname.includes('/laboratories')) return 'laboratories';
    if (location.pathname.includes('/upload-records')) return 'upload-records';
    return 'profile';
  };

  const activeTab = getActiveTab();
  const hasSettingsAdministrationAccess = settingsAdministrationRoles.some((role) => hasRole(role));
  const canAccessActiveTab = settingsAdministrationTabs.has(activeTab)
    ? hasSettingsAdministrationAccess
      : adminOnlySettingsTabs.has(activeTab)
      ? hasRole('super_admin') || hasRole('superadmin')
      : true;

  const handleTabChange = (key: React.Key) => {
    const tabKey = key as string;
    navigate(`/settings/${tabKey}`);
  };

  if (!canAccessActiveTab) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="w-full space-y-4">
      <Card className="shadow-sm">
        <Card.Content className="p-0">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={handleTabChange}
            variant="secondary"
            className="w-full"
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Settings tabs" className="border-b border-gray-200 px-6 pt-4">
                <Tabs.Tab id="profile" className="h-10">
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="h-5 w-5" />
                    <span>Profile</span>
                  </div>
                </Tabs.Tab>
                <Tabs.Tab id="change-password" className="h-10">
                  <div className="flex items-center gap-2">
                    <LockClosedIcon className="h-5 w-5" />
                    <span>Change Password</span>
                  </div>
                </Tabs.Tab>
                <Tabs.Tab id="notifications" className="h-10">
                  <div className="flex items-center gap-2">
                    <BellIcon className="h-5 w-5" />
                    <span>Notifications</span>
                  </div>
                </Tabs.Tab>
                {hasSettingsAdministrationAccess && (
                  <Tabs.Tab id="users" className="h-10">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-5 w-5" />
                      <span>Users</span>
                    </div>
                  </Tabs.Tab>
                )}
                {hasSettingsAdministrationAccess && (
                  <>
                    <Tabs.Tab id="accounts" className="h-10">
                      <div className="flex items-center gap-2">
                        <BuildingLibraryIcon className="h-5 w-5" />
                        <span>Accounts</span>
                      </div>
                    </Tabs.Tab>
                    {(hasRole('super_admin') || hasRole('superadmin')) && (
                      <Tabs.Tab id="laboratories" className="h-10">
                        <div className="flex items-center gap-2">
                          <BuildingLibraryIcon className="h-5 w-5" />
                          <span>Laboratories</span>
                        </div>
                      </Tabs.Tab>
                    )}
                    {(hasRole('super_admin') || hasRole('superadmin')) && (
                      <Tabs.Tab id="upload-records" className="h-10">
                        <div className="flex items-center gap-2">
                          <ArrowUpTrayIcon className="h-5 w-5" />
                          <span>Upload Records</span>
                        </div>
                      </Tabs.Tab>
                    )}
                    <Tabs.Tab id="roles-permissions" className="h-10">
                      <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="h-5 w-5" />
                        <span>Roles &amp; Permissions</span>
                      </div>
                    </Tabs.Tab>
                  </>
                )}
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="profile" className="p-2"><SettingsProfile /></Tabs.Panel>
            <Tabs.Panel id="change-password" className="p-2"><SettingsChangePassword /></Tabs.Panel>
            <Tabs.Panel id="notifications" className="p-2"><SettingsNotifications /></Tabs.Panel>
            {hasSettingsAdministrationAccess && (
              <>
                <Tabs.Panel id="users" className="p-2"><SettingsUsers /></Tabs.Panel>
                <Tabs.Panel id="accounts" className="p-2"><SettingsAccounts /></Tabs.Panel>
                {(hasRole('super_admin') || hasRole('superadmin')) && (
                  <Tabs.Panel id="laboratories" className="p-2"><SettingsLaboratories /></Tabs.Panel>
                )}
                {(hasRole('super_admin') || hasRole('superadmin')) && (
                  <Tabs.Panel id="upload-records" className="p-2"><SettingsUploadRecords /></Tabs.Panel>
                )}
                <Tabs.Panel id="roles-permissions" className="p-2"><SettingsRolesPermissions /></Tabs.Panel>
              </>
            )}
          </Tabs>
        </Card.Content>
      </Card>
    </div>
  );
};

export default SettingsPage;
