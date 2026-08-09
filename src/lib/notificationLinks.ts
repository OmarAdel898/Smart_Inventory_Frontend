import type { Notification, NotificationType } from '@/api/notifications';
import {
  AlertOctagon,
  AlertTriangle,
  FileCheck,
  Handshake,
  PackageCheck,
  PackageMinus,
  type LucideIcon,
} from 'lucide-react';

const LINK_ROUTES: Record<NotificationType, string> = {
  'approval.requested': '/approvals',
  'anomaly.flagged': '/anomalies',
  'lowstock.detected': '/inventory',
  'po.received': '/purchase-orders',
  'vendor.responded': '/negotiations',
};


export function getNotificationLink(notification: Notification): string {
  const d = notification?.data ?? {};

  switch (notification.type) {
    case 'approval.requested': {
      return LINK_ROUTES['approval.requested'];
    }
    case 'anomaly.flagged': {
      return LINK_ROUTES['anomaly.flagged'];
    }
    case 'lowstock.detected': {
      const skuId = typeof d.skuId === 'string' ? d.skuId : '';
      return skuId ? `/inventory?skuId=${encodeURIComponent(skuId)}` : LINK_ROUTES['lowstock.detected'];
    }
    case 'po.received': {
      const id = typeof d.purchaseOrderId === 'string' ? d.purchaseOrderId : '';
      return id ? `${LINK_ROUTES['po.received']}/${id}` : LINK_ROUTES['po.received'];
    }
    case 'vendor.responded': {
      return LINK_ROUTES['vendor.responded'];
    }
    default:
      return '/';
  }
}

export function getNotificationIcon(type: NotificationType): { icon: LucideIcon; className: string } {
  switch (type) {
    case 'approval.requested':
      return { icon: FileCheck, className: 'bg-amber-50 text-amber-600' };
    case 'anomaly.flagged':
      return { icon: AlertOctagon, className: 'bg-red-50 text-[#B30024]' };
    case 'lowstock.detected':
      return { icon: PackageMinus, className: 'bg-amber-50 text-amber-600' };
    case 'po.received':
      return { icon: PackageCheck, className: 'bg-[#E6F4FF] text-[#0066CC]' };
    case 'vendor.responded':
      return { icon: Handshake, className: 'bg-emerald-50 text-emerald-600' };
    default:
      return { icon: AlertTriangle, className: 'bg-gray-100 text-gray-600' };
  }
}
