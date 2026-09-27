import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardBody, Tabs, Tab } from '@heroui-v2/react';
import {
  UserCircleIcon,
  LockClosedIcon,
  BellIcon,
  UsersIcon,
  ShieldCheckIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import { SettingsProfile } from './profile';
import { SettingsChangePassword } from './change-password';
import { SettingsNotifications } from './notifications';
import { SettingsUsers } from './users';
import { SettingsRolesPermissions } from './roles-permissions';
import { SettingsAccounts } from './accounts';
import { SettingsLaboratories } from './laboratories';
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
    <div className="w-full  space-y-4">
      <Card className="shadow-sm">
        <CardBody className="p-0">
          <Tabs
            aria-label="Settings tabs"
            selectedKey={activeTab}
            onSelectionChange={handleTabChange}
            color='primary'
            variant='light'
            classNames={{
              base: "w-full",
              tabList: "border-b border-gray-200 px-6 pt-4",
              tab: "h-10",
              tabContent: "text-sm font-medium",
              panel: "p-2",
            }}
          >
            {/* Common Settings */}
            <Tab
              key="profile"
              title={
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="h-5 w-5" />
                  <span>Profile</span>
                </div>
              }
            >
              <SettingsProfile />
            </Tab>

            <Tab
              key="change-password"
              title={
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="h-5 w-5" />
                  <span>Change Password</span>
                </div>
              }
            >
              <SettingsChangePassword />
            </Tab>

            <Tab
              key="notifications"
              title={
                <div className="flex items-center gap-2">
                  <BellIcon className="h-5 w-5" />
                  <span>Notifications</span>
                </div>
              }
            >
              <SettingsNotifications />
            </Tab>


            {/* Admin Settings */}
            {hasSettingsAdministrationAccess && (
                <Tab
                  key="users"
                  title={
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-5 w-5" />
                      <span>Users</span>
                    </div>
                  }
                >
                  <SettingsUsers />
                </Tab>
            )}

            {hasSettingsAdministrationAccess && (
              <>
                <Tab
                  key="accounts"
                  title={
                    <div className="flex items-center gap-2">
                      <BuildingLibraryIcon className="h-5 w-5" />
                      <span>Accounts</span>
                    </div>
                  }
                >
                  <SettingsAccounts />
                </Tab>

                {(hasRole('super_admin') || hasRole('superadmin')) && (
                  <Tab
                    key="laboratories"
                    title={
                      <div className="flex items-center gap-2">
                        <BuildingLibraryIcon className="h-5 w-5" />
                        <span>Laboratories</span>
                      </div>
                    }
                  >
                    <SettingsLaboratories />
                  </Tab>
                )}

                <Tab
                  key="roles-permissions"
                  title={
                    <div className="flex items-center gap-2">
                      <ShieldCheckIcon className="h-5 w-5" />
                      <span>Roles & Permissions</span>
                    </div>
                  }
                >
                  <SettingsRolesPermissions />
                </Tab>
              </>
            )}
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
};

export default SettingsPage;
