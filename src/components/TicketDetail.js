import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileVideoCamera,
} from 'lucide-react';
import InlineTag from './InlineTag';
import TicketEntry from './TicketEntry';
import { buildSlaDisplay, formatDuration, getSlaPolicy, SLA_STATE_LABELS } from '../utils/sla';
import { formatEasternTime, formatTicketCreated, toKebabCase } from '../utils/format';
import { getTicketDescription } from '../utils/tickets';
import { createTask, fetchTasks, updateTask } from '../api';

const createId = (prefix) => `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

const AI_RULES = [
  {
    keywords: ['vpn', 'remote access', 'duo', 'mfa'],
    category: 'Access',
    impact: 'Just me',
    urgency: 'Normal',
    priority: 'Medium',
    reply:
      'Thanks for the VPN access request. I have the details and will coordinate access with Security. If access is time-bound, please confirm the start/end dates.',
  },
  {
    keywords: ['laptop', 'battery', 'replacement', 'dock', 'monitor'],
    category: 'Hardware',
    impact: 'Just me',
    urgency: 'Normal',
    priority: 'Medium',
    reply:
      'Thanks for the hardware request. I am reviewing the asset details and will follow up with next steps for a replacement or repair.',
  },
  {
    keywords: ['email', 'outlook', 'mailbox', 'delivery', 'spam'],
    category: 'Email',
    impact: 'My team',
    urgency: 'Normal',
    priority: 'Medium',
    reply:
      'Thanks for the email report. I am checking the mail flow and will update you with findings or next steps.',
  },
  {
    keywords: ['printer', 'print', 'paper jam', 'toner'],
    category: 'Facilities',
    impact: 'My team',
    urgency: 'Normal',
    priority: 'Low',
    reply:
      'Thanks for the printer report. I will coordinate maintenance and confirm when it is back in service.',
  },
  {
    keywords: ['slow', 'performance', 'freeze', 'crash'],
    category: 'Hardware',
    impact: 'Just me',
    urgency: 'Normal',
    priority: 'Medium',
    reply:
      'Thanks for the report. I am reviewing diagnostics and will follow up with troubleshooting steps.',
  },
  {
    keywords: ['account', 'access', 'permission', 'share', 'drive'],
    category: 'Account / Access',
    impact: 'Just me',
    urgency: 'Normal',
    priority: 'Low',
    reply:
      'Thanks for the access request. Please confirm the required access level and any approvals so I can proceed.',
  },
];

const buildAiSuggestion = (ticket) => {
  if (!ticket) return null;
  const text = `${ticket.title || ''} ${getTicketDescription(ticket)}`.toLowerCase();
  const matchedRule = AI_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  if (!matchedRule) return null;
  return {
    category: matchedRule.category,
    impact: matchedRule.impact,
    urgency: matchedRule.urgency,
    priority: matchedRule.priority,
    reply: matchedRule.reply,
    reason: `Matched keywords: ${matchedRule.keywords.filter((keyword) => text.includes(keyword)).join(', ')}`,
  };
};

const extractFileName = (value) => {
  if (!value || typeof value !== 'string') return '';
  const withoutQuery = value.split('?')[0].split('#')[0];
  const parts = withoutQuery.split('/');
  return parts[parts.length - 1] || '';
};

const getFileExtension = (name) => {
  if (!name || typeof name !== 'string') return '';
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === name.length - 1) return '';
  return name.slice(lastDot + 1).toLowerCase();
};

const inferMimeFromName = (name) => {
  const ext = getFileExtension(name);
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'webm':
      return 'video/webm';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    default:
      return '';
  }
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const rounded = unitIndex === 0 || size >= 10 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
};

const normalizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((attachment, index) => {
      if (!attachment) return null;
      if (typeof attachment === 'string') {
        const name = extractFileName(attachment) || `Attachment ${index + 1}`;
        return {
          id: `att-${index + 1}`,
          name,
          url: attachment,
          type: inferMimeFromName(name),
          size: null,
          extension: getFileExtension(name),
        };
      }

      const url =
        attachment.url ||
        attachment.downloadUrl ||
        attachment.contentUrl ||
        attachment.href ||
        attachment.link ||
        attachment.previewUrl ||
        '';
      const name =
        attachment.name ||
        attachment.filename ||
        attachment.fileName ||
        attachment.title ||
        extractFileName(url) ||
        `Attachment ${index + 1}`;
      const type = attachment.type || attachment.mimeType || attachment.contentType || inferMimeFromName(name);
      const rawSize = attachment.size ?? attachment.bytes ?? attachment.sizeBytes ?? attachment.length;
      const parsedSize = Number.isFinite(rawSize) ? rawSize : Number.parseInt(rawSize, 10);
      const size = Number.isFinite(parsedSize) ? parsedSize : null;
      return {
        id: attachment.id || attachment.attachmentId || `att-${index + 1}`,
        name,
        url,
        type,
        size,
        extension: getFileExtension(name),
      };
    })
    .filter(Boolean);
};

const getAttachmentKind = (attachment) => {
  const type = (attachment.type || '').toLowerCase();
  const extension = attachment.extension;
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf') return 'pdf';
  if (extension === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) return 'image';
  if (['mp4', 'mov', 'webm'].includes(extension)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
  return 'file';
};

const getAttachmentIcon = (attachment) => {
  const kind = getAttachmentKind(attachment);
  if (kind === 'image') return FileImage;
  if (kind === 'video') return FileVideoCamera;
  if (kind === 'audio') return FileMusic;
  const extension = attachment.extension;
  if (['pdf', 'txt', 'rtf', 'doc', 'docx', 'odt'].includes(extension)) return FileText;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) return FileSpreadsheet;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return FileArchive;
  if (['json', 'js', 'ts', 'tsx', 'jsx', 'py', 'java', 'rb', 'go', 'cs', 'yaml', 'yml'].includes(extension)) {
    return FileCode;
  }
  return File;
};

function TicketDetail({
  activeTicket,
  currentUser,
  assignees,
  statusOptions,
  intakeEmail,
  intakeSource,
  requesterRecord,
  requesterAssets,
  problems,
  changeEvents,
  cannedResponses,
  selectedCannedId,
  onSelectCannedId,
  pendingCannedBody,
  onConsumeCannedBody,
  onBack,
  onTicketUpdate,
  onAddEntry,
}) {
  const [noteDraft, setNoteDraft] = useState('');
  const [showTasks, setShowTasks] = useState(false);
  const [taskDraft, setTaskDraft] = useState({ title: '', assignee: assignees[0], due: '' });
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeTicket) return undefined;
    let isActive = true;
    const loadTasks = async () => {
      setTasksLoading(true);
      setTasksError('');
      setTasks([]);
      try {
        const response = await fetchTasks({ ticketId: activeTicket.id, limit: 50, offset: 0 });
        if (!isActive) return;
        setTasks(response.tasks || []);
      } catch (error) {
        if (!isActive) return;
        setTasksError('Unable to load tasks right now.');
      } finally {
        if (isActive) setTasksLoading(false);
      }
    };
    loadTasks();
    return () => {
      isActive = false;
    };
  }, [activeTicket]);

  useEffect(() => {
    if (!pendingCannedBody || !activeTicket) return;
    setNoteDraft((prev) => (prev ? `${prev}\n\n${pendingCannedBody}` : pendingCannedBody));
    onConsumeCannedBody();
  }, [pendingCannedBody, activeTicket, onConsumeCannedBody]);

  useEffect(() => {
    setNoteDraft('');
    setShowTasks(false);
  }, [activeTicket?.id]);

  const activeTasks = tasks;
  const slaPolicy = activeTicket ? getSlaPolicy(activeTicket.priority) : null;
  const responseSla = activeTicket?.createdAt
    ? buildSlaDisplay({
        startAt: activeTicket.createdAt,
        targetMs: slaPolicy.responseMs,
        completedAt: activeTicket.respondedAt,
        now,
        warnMs: slaPolicy.responseWarnMs,
      })
    : null;
  const resolveSla = activeTicket?.createdAt
    ? buildSlaDisplay({
        startAt: activeTicket.createdAt,
        targetMs: slaPolicy.resolveMs,
        completedAt: activeTicket.resolvedAt,
        now,
        warnMs: slaPolicy.resolveWarnMs,
      })
    : null;

  const cannedOptions = useMemo(
    () => cannedResponses.map((response) => ({ id: response.id, title: response.title, body: response.body })),
    [cannedResponses],
  );
  const descriptionText = getTicketDescription(activeTicket);
  const attachments = useMemo(
    () => normalizeAttachments(activeTicket?.attachments),
    [activeTicket?.attachments],
  );
  const aiSuggestion = useMemo(() => buildAiSuggestion(activeTicket), [activeTicket]);
  const linkedProblem = useMemo(
    () => problems?.find((problem) => problem.id === activeTicket?.problemId) || null,
    [problems, activeTicket?.problemId],
  );
  const linkedChange = useMemo(
    () => changeEvents?.find((change) => change.id === activeTicket?.changeId) || null,
    [changeEvents, activeTicket?.changeId],
  );

  const handleAddEntry = (type) => {
    if (!activeTicket) return;
    const text = noteDraft.trim();
    if (!text) return;
    const time = formatEasternTime(Date.now());
    const entry = { id: `entry-${Date.now()}`, type, author: currentUser, time, text };
    onAddEntry(activeTicket.id, entry);
    setNoteDraft('');
  };

  const handleAddTask = async () => {
    if (!activeTicket || !taskDraft.title.trim()) return;
    const newTask = {
      id: createId('TSK'),
      ticketId: activeTicket.id,
      title: taskDraft.title.trim(),
      assignee: taskDraft.assignee,
      status: 'Not started',
      due: taskDraft.due || 'Unscheduled',
    };
    setTasks((prev) => [newTask, ...prev]);
    setTaskDraft({ title: '', assignee: assignees[0], due: '' });
    try {
      const response = await createTask(newTask);
      if (response?.task) {
        setTasks((prev) => prev.map((task) => (task.id === newTask.id ? response.task : task)));
      }
    } catch (error) {
      setTasksError('Unable to save the new task.');
    }
  };

  const handleToggleTask = async (task) => {
    const nextStatus = task.status === 'Completed' ? 'Not started' : 'Completed';
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)));
    try {
      await updateTask(task.id, { status: nextStatus });
    } catch (error) {
      setTasksError('Unable to update task status.');
    }
  };

  const handleInsertCanned = () => {
    const response = cannedOptions.find((item) => item.id === selectedCannedId);
    if (!response) return;
    setNoteDraft((prev) => (prev ? `${prev}\n\n${response.body}` : response.body));
  };

  const handleDownloadAll = () => {
    const downloadable = attachments.filter((attachment) => attachment.url);
    if (downloadable.length === 0) return;
    downloadable.forEach((attachment) => {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name || '';
      link.rel = 'noreferrer';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const renderAttachmentPreview = (attachment) => {
    const kind = getAttachmentKind(attachment);
    const Icon = getAttachmentIcon(attachment);
    if (!attachment.url) {
      return (
        <div className="attachment-fallback">
          <Icon size={36} />
          <span>{attachment.extension ? attachment.extension.toUpperCase() : 'FILE'}</span>
        </div>
      );
    }
    if (kind === 'image') {
      return <img src={attachment.url} alt={attachment.name} loading="lazy" />;
    }
    if (kind === 'video') {
      return (
        <video controls preload="metadata">
          <source src={attachment.url} type={attachment.type || undefined} />
        </video>
      );
    }
    if (kind === 'audio') {
      return (
        <audio controls preload="metadata">
          <source src={attachment.url} type={attachment.type || undefined} />
        </audio>
      );
    }
    if (kind === 'pdf') {
      return <iframe title={attachment.name} src={attachment.url} loading="lazy" />;
    }
    return (
      <div className="attachment-fallback">
        <Icon size={36} />
        <span>{attachment.extension ? attachment.extension.toUpperCase() : 'FILE'}</span>
      </div>
    );
  };

  if (!activeTicket) {
    return (
      <section className="card ticket-detail-page">
        <div className="ticket-detail-hero">
          <div>
            <button className="btn btn-ghost btn-small" type="button" onClick={onBack}>
              Back to tickets
            </button>
            <div className="section-title">Ticket workspace</div>
            <h2 className="section-heading">Ticket details</h2>
            <p className="section-sub">Full-screen view with requester context, SLAs, and updates.</p>
          </div>
        </div>
        <div className="empty-state">
          <p>Select a ticket from the queue to view details.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card ticket-detail-page">
      <div className="ticket-detail-hero">
        <div>
          <button className="btn btn-ghost btn-small" type="button" onClick={onBack}>
            Back to tickets
          </button>
          <div className="section-title">Ticket workspace</div>
          <h2 className="section-heading">
            {activeTicket.id} - {activeTicket.title}
          </h2>
          <p className="section-sub">Full-screen view with requester context, SLAs, and updates.</p>
        </div>
        <div className="ticket-detail-hero-meta">
          <InlineTag>{activeTicket.type}</InlineTag>
          <span className={`priority-tag ${toKebabCase(activeTicket.priority)}`}>{activeTicket.priority}</span>
          <span className={`status-pill status-${toKebabCase(activeTicket.status)}`}>{activeTicket.status}</span>
        </div>
      </div>

      <div className="ticket-detail">
        <div className="ticket-detail-header">
          <div>
            <div className="list-inline">
              <InlineTag>{activeTicket.type}</InlineTag>
              <InlineTag className="mono">{activeTicket.id}</InlineTag>
              <span className={`priority-tag ${toKebabCase(activeTicket.priority)}`}>{activeTicket.priority}</span>
              <span className={`status-pill status-${toKebabCase(activeTicket.status)}`}>{activeTicket.status}</span>
            </div>
            <h3 className="ticket-title">{activeTicket.title}</h3>
            <p className="work-meta">
              {activeTicket.requester} - {activeTicket.requesterEmail}
            </p>
            <p className="work-meta">
              {activeTicket.department} | Preferred contact: {activeTicket.contactPreference}
            </p>
          </div>
          <div className="ticket-actions">
            <button
              className="btn btn-ghost btn-small"
              type="button"
              disabled={['Resolved', 'Closed'].includes(activeTicket.status)}
              onClick={() => onTicketUpdate(activeTicket.id, { assignee: currentUser })}
            >
              Assign to me
            </button>
            <button
              className="btn btn-primary btn-small"
              type="button"
              disabled={['Resolved', 'Closed'].includes(activeTicket.status)}
              onClick={() => onTicketUpdate(activeTicket.id, { status: 'Resolved' })}
            >
              Resolve
            </button>
          </div>
        </div>

        <div className="ticket-detail-grid">
          <div className="detail-card">
            <div className="detail-label">Category</div>
            <div className="detail-value">{activeTicket.category}</div>
            <div className="detail-label">Impact</div>
            <div className="detail-value">{activeTicket.impact}</div>
            <div className="detail-label">Urgency</div>
            <div className="detail-value">{activeTicket.urgency}</div>
          </div>
          <div className="detail-card">
            <div className="detail-label">Device / Asset</div>
            <div className="detail-value">{activeTicket.device}</div>
            <div className="detail-label">Created</div>
            <div className="detail-value">{formatTicketCreated(activeTicket)}</div>
          </div>
          <div className="detail-card">
            <div className="detail-label">Intake</div>
            <div className="detail-value">{intakeSource}</div>
            <div className="detail-label">Inbox</div>
            <div className="detail-value">{intakeEmail}</div>
          </div>
          <div className="detail-card">
            <label className="control-label">
              <span>Assignee</span>
              <select
                className="control-select"
                value={activeTicket.assignee}
                onChange={(event) => onTicketUpdate(activeTicket.id, { assignee: event.target.value })}
              >
                {assignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </label>
            <label className="control-label">
              <span>Status</span>
              <select
                className="control-select"
                value={activeTicket.status}
                onChange={(event) => onTicketUpdate(activeTicket.id, { status: event.target.value })}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="ticket-profile">
          <div className="detail-card">
            <div className="detail-label">Requester profile</div>
            {requesterRecord ? (
              <div className="profile-grid">
                <div>
                  <div className="detail-value">
                    {requesterRecord.firstName} {requesterRecord.lastName}
                  </div>
                  <div className="profile-meta">{requesterRecord.jobTitle}</div>
                  <div className="profile-meta">
                    {requesterRecord.department} - {requesterRecord.location}
                  </div>
                </div>
                <div>
                  <div className="detail-label">Supervisor</div>
                  <div className="detail-value">{requesterRecord.supervisor || 'Not listed'}</div>
                  <div className="detail-label">Start date</div>
                  <div className="detail-value">{requesterRecord.startDate || 'Not listed'}</div>
                </div>
                <div>
                  <div className="detail-label">Email</div>
                  <div className="detail-value">{requesterRecord.email}</div>
                  <div className="detail-label">Mobile</div>
                  <div className="detail-value">{requesterRecord.mobilePhone || 'Not listed'}</div>
                </div>
              </div>
            ) : (
              <div className="detail-value">No employee record found in Employee Information Hub.</div>
            )}
          </div>
          <div className="detail-card">
            <div className="detail-label">Assigned assets</div>
            {requesterRecord ? (
              <div className="asset-grid">
                {requesterAssets.map((asset) => (
                  <div key={asset.label} className="asset-chip">
                    <span>{asset.label}</span>
                    <strong>{asset.value}</strong>
                  </div>
                ))}
                {requesterAssets.length === 0 && <div className="detail-value">No assets listed.</div>}
              </div>
            ) : (
              <div className="detail-value">No assets listed.</div>
            )}
          </div>
        </div>

        <div className="ticket-sla">
          <div className="detail-card sla-card">
            <div className="detail-label">Response SLA</div>
            {responseSla && (
              <>
                <div className="sla-row">
                  <span className={`sla-state ${responseSla.state}`}>{SLA_STATE_LABELS[responseSla.state]}</span>
                  <span className="sla-value">{responseSla.label}</span>
                </div>
                <div className="sla-meta">Target: {formatDuration(slaPolicy.responseMs)}</div>
              </>
            )}
          </div>
          <div className="detail-card sla-card">
            <div className="detail-label">Resolution SLA</div>
            {resolveSla && (
              <>
                <div className="sla-row">
                  <span className={`sla-state ${resolveSla.state}`}>{SLA_STATE_LABELS[resolveSla.state]}</span>
                  <span className="sla-value">{resolveSla.label}</span>
                </div>
                <div className="sla-meta">Target: {formatDuration(slaPolicy.resolveMs)}</div>
              </>
            )}
          </div>
        </div>

        <div className="detail-card link-card">
          <div className="detail-label">Linked records</div>
          <label className="control-label">
            <span>Problem</span>
            <select
              className="control-select"
              value={activeTicket.problemId || ''}
              onChange={(event) =>
                onTicketUpdate(activeTicket.id, { problemId: event.target.value || null })
              }
            >
              <option value="">Not linked</option>
              {(problems || []).map((problem) => (
                <option key={problem.id} value={problem.id}>
                  {problem.id} - {problem.title}
                </option>
              ))}
            </select>
          </label>
          {linkedProblem && (
            <div className="link-preview">
              <div className="work-meta">
                Status: {linkedProblem.status} · Impact: {linkedProblem.impact}
              </div>
              {linkedProblem.rootCause && <div className="work-meta">Root cause: {linkedProblem.rootCause}</div>}
            </div>
          )}
          <label className="control-label">
            <span>Change</span>
            <select
              className="control-select"
              value={activeTicket.changeId || ''}
              onChange={(event) =>
                onTicketUpdate(activeTicket.id, { changeId: event.target.value || null })
              }
            >
              <option value="">Not linked</option>
              {(changeEvents || []).map((change) => (
                <option key={change.id} value={change.id}>
                  {change.id} - {change.title}
                </option>
              ))}
            </select>
          </label>
          {linkedChange && (
            <div className="link-preview">
              <div className="work-meta">
                Window: {linkedChange.window} · Status: {linkedChange.status}
              </div>
            </div>
          )}
        </div>

        <div className="detail-card escalation-card">
          <div className="detail-label">Escalation rules ({activeTicket.priority})</div>
          <ul className="escalation-list">
            {slaPolicy.escalation.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        <div className="detail-card task-card">
          <div className="task-header">
            <div className="detail-label">Tasks</div>
            <button className="btn btn-ghost btn-small" type="button" onClick={() => setShowTasks((prev) => !prev)}>
              {showTasks ? 'Hide tasks' : 'Show tasks'}
            </button>
          </div>
          {showTasks && (
            <>
              <div className="task-list">
                {tasksLoading && <p className="empty-text">Loading tasks...</p>}
                {!tasksLoading && activeTasks.length === 0 && <p className="empty-text">No tasks for this ticket yet.</p>}
                {activeTasks.map((task) => (
                  <div key={task.id} className="task-row">
                    <div>
                      <div className="list-inline">
                        <InlineTag className="mono">{task.id}</InlineTag>
                        <span className={`status-pill status-${toKebabCase(task.status)}`}>{task.status}</span>
                      </div>
                      <p className="work-title">{task.title}</p>
                      <p className="work-meta">
                        {task.assignee} - Due {task.due}
                      </p>
                    </div>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => handleToggleTask(task)}>
                      {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                    </button>
                  </div>
                ))}
              </div>
              {tasksError && <p className="empty-text">{tasksError}</p>}
              <div className="task-form">
                <label className="label">
                  Task title
                  <input
                    className="input"
                    value={taskDraft.title}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="e.g. Validate user access request"
                  />
                </label>
                <label className="label">
                  Assignee
                  <select
                    className="control-select"
                    value={taskDraft.assignee}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, assignee: event.target.value }))}
                  >
                    {assignees.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="label">
                  Due date
                  <input
                    className="input"
                    value={taskDraft.due}
                    onChange={(event) => setTaskDraft((prev) => ({ ...prev, due: event.target.value }))}
                    placeholder="e.g. Tomorrow 3:00p"
                  />
                </label>
                <button className="btn btn-primary btn-small" type="button" onClick={handleAddTask}>
                  Add task
                </button>
              </div>
            </>
          )}
        </div>

        <div className="ticket-description">
          <div className="detail-label">Description</div>
          {descriptionText ? <p className="ticket-description-text">{descriptionText}</p> : <p className="work-meta">No description provided.</p>}
        </div>

        <div className="detail-card ai-card">
          <div className="detail-label">Smart assist</div>
          {aiSuggestion ? (
            <>
              <div className="ai-grid">
                <div>
                  <div className="detail-label">Suggested category</div>
                  <div className="detail-value">{aiSuggestion.category}</div>
                </div>
                <div>
                  <div className="detail-label">Priority</div>
                  <div className="detail-value">{aiSuggestion.priority}</div>
                </div>
                <div>
                  <div className="detail-label">Impact</div>
                  <div className="detail-value">{aiSuggestion.impact}</div>
                </div>
                <div>
                  <div className="detail-label">Urgency</div>
                  <div className="detail-value">{aiSuggestion.urgency}</div>
                </div>
              </div>
              <p className="work-meta">{aiSuggestion.reason}</p>
              <div className="ai-actions">
                <button
                  className="btn btn-ghost btn-small"
                  type="button"
                  onClick={() =>
                    onTicketUpdate(activeTicket.id, {
                      category: aiSuggestion.category,
                      priority: aiSuggestion.priority,
                      impact: aiSuggestion.impact,
                      urgency: aiSuggestion.urgency,
                    })
                  }
                >
                  Apply classification
                </button>
                <button
                  className="btn btn-primary btn-small"
                  type="button"
                  onClick={() =>
                    setNoteDraft((prev) => (prev ? `${prev}\n\n${aiSuggestion.reply}` : aiSuggestion.reply))
                  }
                >
                  Use suggested reply
                </button>
              </div>
            </>
          ) : (
            <p className="work-meta">No automated suggestions yet. Add more detail to improve recommendations.</p>
          )}
        </div>

        <div className="ticket-attachments">
          <div className="attachment-header">
            <div className="detail-label">Attachments</div>
            {attachments.filter((attachment) => attachment.url).length > 1 && (
              <button className="btn btn-ghost btn-small" type="button" onClick={handleDownloadAll}>
                <Download size={14} />
                <span>Download all</span>
              </button>
            )}
          </div>
          {attachments.length ? (
            <div className="attachment-grid">
              {attachments.map((attachment) => {
                const kind = getAttachmentKind(attachment);
                const typeLabel = attachment.type
                  ? attachment.type.split('/').pop().split(';')[0].toUpperCase()
                  : attachment.extension
                  ? attachment.extension.toUpperCase()
                  : '';
                const sizeLabel = attachment.size ? formatBytes(attachment.size) : '';
                const details = [typeLabel, sizeLabel].filter(Boolean).join(' • ');
                return (
                  <div key={attachment.id} className="attachment-card">
                    <div className="attachment-preview">{renderAttachmentPreview(attachment)}</div>
                    <div className="attachment-meta">
                      <div className="attachment-name" title={attachment.name}>
                        {attachment.name}
                      </div>
                      {details ? <div className="attachment-details">{details}</div> : <div className="attachment-details">Attachment</div>}
                      <div className="attachment-actions">
                        {attachment.url ? (
                          <>
                            <a className="btn btn-ghost btn-small" href={attachment.url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                            {kind !== 'image' && (
                              <a className="btn btn-ghost btn-small" href={attachment.url} download={attachment.name}>
                                <Download size={14} />
                                <span>Download</span>
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="work-meta">No file link available.</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="work-meta">No attachments uploaded.</p>
          )}
        </div>

        <div className="ticket-activity">
          <div className="activity-header">
            <h4>Notes and messages</h4>
            <span className="timestamp">{activeTicket.entries?.length || 0} updates</span>
          </div>
          <div className="entry-list">
            {(activeTicket.entries || []).map((entry) => (
              <TicketEntry key={entry.id} entry={entry} />
            ))}
            {(!activeTicket.entries || activeTicket.entries.length === 0) && (
              <div className="empty-state">
                <p>No updates yet. Add a note or message below.</p>
              </div>
            )}
          </div>
          <div className="entry-composer">
            <div className="composer-row">
              <label className="control-label">
                <span>Canned response</span>
                <select
                  className="control-select"
                  value={selectedCannedId}
                  onChange={(event) => onSelectCannedId(event.target.value)}
                >
                  {cannedOptions.map((response) => (
                    <option key={response.id} value={response.id}>
                      {response.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-ghost btn-small" type="button" onClick={handleInsertCanned}>
                Insert
              </button>
            </div>
            <label className="label">
              Add update
              <textarea
                className="textarea"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add troubleshooting notes or a response to the requester."
              />
            </label>
            <div className="entry-actions">
              <button
                className="btn btn-ghost btn-small"
                type="button"
                disabled={!noteDraft.trim()}
                onClick={() => handleAddEntry('note')}
              >
                Add internal note
              </button>
              <button
                className="btn btn-primary btn-small"
                type="button"
                disabled={!noteDraft.trim()}
                onClick={() => handleAddEntry('message')}
              >
                Send message to requester
              </button>
            </div>
            <p className="entry-hint">Internal notes are only visible to IT. Messages go to the requester.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TicketDetail;
