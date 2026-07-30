import { usePermissions } from '@/hooks/useCan';
import ApprovalQueuePage from '@/pages/ApprovalQueue/ApprovalQueuePage';

export default function Approvals() {
  const { can } = usePermissions();

  if (!can('approvals.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <span className="material-symbols-outlined text-[64px] text-outline mb-4">lock</span>
        <h2 className="text-headline-md font-semibold text-on-surface mb-2">Access Denied</h2>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          You do not have permission to view the Approvals page. Contact your administrator.
        </p>
      </div>
    );
  }

  return <ApprovalQueuePage />;
}
