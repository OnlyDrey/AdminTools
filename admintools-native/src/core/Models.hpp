#pragma once

#include <QDateTime>
#include <QJsonObject>
#include <QString>
#include <QStringList>
#include <QVector>

#include <optional>

namespace admintools::core {

enum class SessionProtocol {
  Ssh,
  Sftp,
  Rdp
};

enum class ConnectionState {
  Disconnected,
  Connecting,
  Connected,
  Reconnecting,
  Failed
};

struct ConnectionDiagnostic {
  QDateTime timestamp;
  QString category;
  QString message;
  QString detailCode;
};

struct ActivityEvent {
  QDateTime timestamp;
  QString source;
  QString summary;
  QString sessionId;
};

struct CredentialProfile {
  QString id;
  QString name;
  QString username;
  QString secretReference;
  bool useWindowsCredentialManager{true};
};

struct SessionTemplate {
  QString id;
  QString name;
  SessionProtocol protocol;
  quint16 port;
  QJsonObject defaults;
};

struct Session {
  QString id;
  QString folderId;
  QString displayName;
  SessionProtocol protocol;
  QString host;
  quint16 port;
  QString credentialProfileId;
  QJsonObject metadata;
};

struct FolderNode {
  QString id;
  QString parentId;
  QString displayName;
  QVector<QString> childFolderIds;
  QVector<QString> sessionIds;
};

struct SmartView {
  QString id;
  QString name;
  QString description;
  QString queryExpression;
};

struct WorkspaceTabState {
  QString tabId;
  QString sessionId;
  QString title;
  bool active{false};
};

struct WorkspacePaneState {
  QString paneId;
  QString parentPaneId;
  QString orientation;
  float relativeSize{1.0f};
  QVector<WorkspaceTabState> tabs;
  QString activeTabId;
};

struct WorkspaceState {
  QVector<WorkspacePaneState> panes;
  QString focusedPaneId;
  bool restoreOnStartup{true};
};

QJsonObject toJson(const Session& value);
Session sessionFromJson(const QJsonObject& object);

QJsonObject toJson(const FolderNode& value);
FolderNode folderNodeFromJson(const QJsonObject& object);

QJsonObject toJson(const CredentialProfile& value);
CredentialProfile credentialProfileFromJson(const QJsonObject& object);

QJsonObject toJson(const WorkspaceState& value);
WorkspaceState workspaceStateFromJson(const QJsonObject& object);

} // namespace admintools::core
