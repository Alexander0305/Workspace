import type { Notification } from './nova-store'

export function generateNotificationFromEvent(event: string, data: Record<string, unknown>): Notification | null {
  const id = `not-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  switch (event) {
    case 'task_completed':
      return {
        id,
        title: 'Task Completed',
        message: `Task "${data.title || 'Untitled'}" has been completed!`,
        type: 'success',
        read: false,
        createdAt: new Date(),
      }
    case 'task_created':
      return {
        id,
        title: 'Task Created',
        message: `New task "${data.title || 'Untitled'}" has been added.`,
        type: 'info',
        read: false,
        createdAt: new Date(),
      }
    case 'backup_created':
      return {
        id,
        title: 'Backup Created',
        message: `Backup created successfully (${data.size || 'unknown size'})`,
        type: 'success',
        read: false,
        createdAt: new Date(),
      }
    case 'backup_restored':
      return {
        id,
        title: 'Backup Restored',
        message: 'Data has been restored from backup successfully.',
        type: 'success',
        read: false,
        createdAt: new Date(),
      }
    case 'focus_session_complete':
      return {
        id,
        title: 'Focus Session Complete',
        message: `Focus session completed! ${data.minutes || 25} minutes of focused work.`,
        type: 'success',
        read: false,
        createdAt: new Date(),
      }
    case 'crypto_price_alert': {
      const change = data.change as number || 0
      return {
        id,
        title: 'Crypto Price Alert',
        message: `${data.symbol || 'Unknown'} price changed by ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        type: change >= 0 ? 'info' : 'warning',
        read: false,
        createdAt: new Date(),
      }
    }
    case 'automation_executed':
      return {
        id,
        title: 'Automation Executed',
        message: `Automation "${data.name || 'Unknown'}" was executed successfully.`,
        type: 'success',
        read: false,
        createdAt: new Date(),
      }
    case 'file_uploaded':
      return {
        id,
        title: 'File Uploaded',
        message: `"${data.name || 'File'}" has been uploaded successfully.`,
        type: 'success',
        read: false,
        createdAt: new Date(),
      }
    case 'vault_locked':
      return {
        id,
        title: 'Vault Locked',
        message: 'Password vault has been locked for security.',
        type: 'info',
        read: false,
        createdAt: new Date(),
      }
    case 'knowledge_added':
      return {
        id,
        title: 'Knowledge Added',
        message: `New knowledge entry "${data.title || 'Untitled'}" has been added.`,
        type: 'info',
        read: false,
        createdAt: new Date(),
      }
    case 'update_approved':
      return {
        id,
        title: 'Update Approved',
        message: `Update for "${data.component || 'Unknown'}" has been approved and will be applied.`,
        type: 'info',
        read: false,
        createdAt: new Date(),
      }
    default:
      return null
  }
}
