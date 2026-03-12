#include "core/Models.hpp"

#include <QJsonArray>

namespace admintools::core {
namespace {

QString protocolToString(const SessionProtocol protocol) {
  switch (protocol) {
  case SessionProtocol::Ssh:
    return "ssh";
  case SessionProtocol::Sftp:
    return "sftp";
  case SessionProtocol::Rdp:
    return "rdp";
  }
  return "ssh";
}

SessionProtocol protocolFromString(const QString& value) {
  if (value.compare("sftp", Qt::CaseInsensitive) == 0) {
    return SessionProtocol::Sftp;
  }
  if (value.compare("rdp", Qt::CaseInsensitive) == 0) {
    return SessionProtocol::Rdp;
  }
  return SessionProtocol::Ssh;
}

} // namespace

QJsonObject toJson(const Session& value) {
  return {
    {"id", value.id},
    {"folderId", value.folderId},
    {"displayName", value.displayName},
    {"protocol", protocolToString(value.protocol)},
    {"host", value.host},
    {"port", static_cast<int>(value.port)},
    {"credentialProfileId", value.credentialProfileId},
    {"metadata", value.metadata},
  };
}

Session sessionFromJson(const QJsonObject& object) {
  Session session;
  session.id = object["id"].toString();
  session.folderId = object["folderId"].toString();
  session.displayName = object["displayName"].toString();
  session.protocol = protocolFromString(object["protocol"].toString());
  session.host = object["host"].toString();
  session.port = static_cast<quint16>(object["port"].toInt());
  session.credentialProfileId = object["credentialProfileId"].toString();
  session.metadata = object["metadata"].toObject();
  return session;
}

QJsonObject toJson(const FolderNode& value) {
  QJsonArray childFolders;
  for (const auto& id : value.childFolderIds) {
    childFolders.append(id);
  }

  QJsonArray sessions;
  for (const auto& id : value.sessionIds) {
    sessions.append(id);
  }

  return {
    {"id", value.id},
    {"parentId", value.parentId},
    {"displayName", value.displayName},
    {"childFolderIds", childFolders},
    {"sessionIds", sessions},
  };
}

FolderNode folderNodeFromJson(const QJsonObject& object) {
  FolderNode folder;
  folder.id = object["id"].toString();
  folder.parentId = object["parentId"].toString();
  folder.displayName = object["displayName"].toString();
  for (const auto& child : object["childFolderIds"].toArray()) {
    folder.childFolderIds.push_back(child.toString());
  }
  for (const auto& session : object["sessionIds"].toArray()) {
    folder.sessionIds.push_back(session.toString());
  }
  return folder;
}

QJsonObject toJson(const CredentialProfile& value) {
  return {
    {"id", value.id},
    {"name", value.name},
    {"username", value.username},
    {"secretReference", value.secretReference},
    {"useWindowsCredentialManager", value.useWindowsCredentialManager},
  };
}

CredentialProfile credentialProfileFromJson(const QJsonObject& object) {
  CredentialProfile profile;
  profile.id = object["id"].toString();
  profile.name = object["name"].toString();
  profile.username = object["username"].toString();
  profile.secretReference = object["secretReference"].toString();
  profile.useWindowsCredentialManager = object["useWindowsCredentialManager"].toBool(true);
  return profile;
}

QJsonObject toJson(const WorkspaceState& value) {
  QJsonArray panes;
  for (const auto& pane : value.panes) {
    QJsonArray tabs;
    for (const auto& tab : pane.tabs) {
      tabs.append(QJsonObject{{"tabId", tab.tabId},
                              {"sessionId", tab.sessionId},
                              {"title", tab.title},
                              {"active", tab.active}});
    }

    panes.append(QJsonObject{{"paneId", pane.paneId},
                             {"parentPaneId", pane.parentPaneId},
                             {"orientation", pane.orientation},
                             {"relativeSize", pane.relativeSize},
                             {"tabs", tabs},
                             {"activeTabId", pane.activeTabId}});
  }

  return {{"panes", panes},
          {"focusedPaneId", value.focusedPaneId},
          {"restoreOnStartup", value.restoreOnStartup}};
}

WorkspaceState workspaceStateFromJson(const QJsonObject& object) {
  WorkspaceState workspace;
  workspace.focusedPaneId = object["focusedPaneId"].toString();
  workspace.restoreOnStartup = object["restoreOnStartup"].toBool(true);

  for (const auto& paneValue : object["panes"].toArray()) {
    const auto paneObj = paneValue.toObject();
    WorkspacePaneState pane;
    pane.paneId = paneObj["paneId"].toString();
    pane.parentPaneId = paneObj["parentPaneId"].toString();
    pane.orientation = paneObj["orientation"].toString();
    pane.relativeSize = static_cast<float>(paneObj["relativeSize"].toDouble(1.0));
    pane.activeTabId = paneObj["activeTabId"].toString();

    for (const auto& tabValue : paneObj["tabs"].toArray()) {
      const auto tabObj = tabValue.toObject();
      WorkspaceTabState tab;
      tab.tabId = tabObj["tabId"].toString();
      tab.sessionId = tabObj["sessionId"].toString();
      tab.title = tabObj["title"].toString();
      tab.active = tabObj["active"].toBool();
      pane.tabs.push_back(tab);
    }

    workspace.panes.push_back(pane);
  }

  return workspace;
}

} // namespace admintools::core
