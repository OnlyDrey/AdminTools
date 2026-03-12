#pragma once

#include "rdp/RdpController.hpp"
#include "sessions/SessionManager.hpp"
#include "sftp/SftpController.hpp"
#include "ssh/SshController.hpp"
#include "storage/WorkspaceStateStore.hpp"

#include <QMainWindow>

class QAction;
class QListWidget;
class QLineEdit;

namespace admintools::ui {

class SessionTreeWidget;
class WorkspaceWidget;

class MainWindow : public QMainWindow {
  Q_OBJECT

public:
  MainWindow(sessions::SessionManager* sessionManager, storage::WorkspaceStateStore* workspaceStore,
             QWidget* parent = nullptr);

private:
  void buildShell();
  void bindSignals();
  void refreshSessionList();
  void openSession(const QString& sessionId);

  sessions::SessionManager* sessionManager_;
  storage::WorkspaceStateStore* workspaceStore_;
  ssh::SshController sshController_;
  sftp::SftpController sftpController_;
  rdp::RdpController rdpController_;

  SessionTreeWidget* sessionTree_;
  QListWidget* sessionList_;
  QLineEdit* searchInput_;
  WorkspaceWidget* workspace_;

  QAction* splitRightAction_;
  QAction* splitDownAction_;
};

} // namespace admintools::ui
