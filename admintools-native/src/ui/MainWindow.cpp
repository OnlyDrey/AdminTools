#include "ui/MainWindow.hpp"

#include "ui/SessionTreeWidget.hpp"
#include "ui/WorkspaceWidget.hpp"

#include <QAction>
#include <QDockWidget>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QListWidgetItem>
#include <QMenuBar>
#include <QMessageBox>
#include <QStatusBar>
#include <QToolBar>
#include <QVBoxLayout>
#include <QWidget>

namespace admintools::ui {

MainWindow::MainWindow(sessions::SessionManager* sessionManager,
                       storage::WorkspaceStateStore* workspaceStore, QWidget* parent)
    : QMainWindow(parent), sessionManager_(sessionManager), workspaceStore_(workspaceStore) {
  buildShell();
  bindSignals();
  refreshSessionList();

  workspace_->restoreStateFromModel(workspaceStore_->load());
  statusBar()->showMessage("Ready");
}

void MainWindow::buildShell() {
  setWindowTitle("AdminTools Native");
  resize(1400, 900);

  auto* fileMenu = menuBar()->addMenu("&File");
  fileMenu->addAction("Settings", this, [this] {
    QMessageBox::information(this, "Settings",
                             "Settings surface placeholder:\n"
                             "- Workspace restore toggle\n"
                             "- Credential provider mode\n"
                             "- Protocol defaults");
  });
  fileMenu->addAction("Exit", this, &QWidget::close);

  auto* viewMenu = menuBar()->addMenu("&View");
  splitRightAction_ = viewMenu->addAction("Split Right");
  splitDownAction_ = viewMenu->addAction("Split Down");

  auto* toolbar = addToolBar("Main");
  toolbar->setMovable(false);
  searchInput_ = new QLineEdit(this);
  searchInput_->setPlaceholderText("Search sessions, folders, and smart views");
  toolbar->addWidget(new QLabel("Search: "));
  toolbar->addWidget(searchInput_);

  sessionTree_ = new SessionTreeWidget(this);
  auto* navigationDock = new QDockWidget("Navigation", this);
  navigationDock->setWidget(sessionTree_);
  navigationDock->setAllowedAreas(Qt::LeftDockWidgetArea);
  addDockWidget(Qt::LeftDockWidgetArea, navigationDock);

  sessionList_ = new QListWidget(this);
  auto* listDock = new QDockWidget("Sessions", this);
  listDock->setWidget(sessionList_);
  listDock->setAllowedAreas(Qt::LeftDockWidgetArea);
  addDockWidget(Qt::LeftDockWidgetArea, listDock);
  tabifyDockWidget(navigationDock, listDock);

  workspace_ = new WorkspaceWidget(this);
  setCentralWidget(workspace_);
}

void MainWindow::bindSignals() {
  connect(splitRightAction_, &QAction::triggered, workspace_, &WorkspaceWidget::splitRight);
  connect(splitDownAction_, &QAction::triggered, workspace_, &WorkspaceWidget::splitDown);
  connect(sessionTree_, &SessionTreeWidget::sessionActivated, this, &MainWindow::openSession);

  connect(searchInput_, &QLineEdit::textChanged, this, [this](const QString& value) {
    for (int i = 0; i < sessionList_->count(); ++i) {
      auto* item = sessionList_->item(i);
      const auto isMatch = item->text().contains(value, Qt::CaseInsensitive);
      item->setHidden(!isMatch);
    }
  });

  connect(sessionManager_, &sessions::SessionManager::snapshotChanged, this,
          &MainWindow::refreshSessionList);

  connect(sessionList_, &QListWidget::itemDoubleClicked, this, [this](QListWidgetItem* item) {
    openSession(item->data(Qt::UserRole).toString());
  });
}

void MainWindow::refreshSessionList() {
  sessionTree_->setSnapshot(sessionManager_->snapshot());

  sessionList_->clear();
  for (const auto& session : sessionManager_->snapshot().sessions) {
    auto* item = new QListWidgetItem(session.displayName, sessionList_);
    item->setData(Qt::UserRole, session.id);
    item->setToolTip(QString("%1:%2").arg(session.host).arg(session.port));
  }
}

void MainWindow::openSession(const QString& sessionId) {
  const auto* session = sessionManager_->findSession(sessionId);
  if (session == nullptr) {
    return;
  }

  switch (session->protocol) {
  case core::SessionProtocol::Ssh:
    sshController_.connect(*session);
    break;
  case core::SessionProtocol::Sftp:
    sftpController_.connect(*session);
    break;
  case core::SessionProtocol::Rdp:
    if (!rdpController_.launchEmbedded(*session)) {
      rdpController_.launchExternalFallback(*session);
    }
    break;
  }

  workspace_->openSessionInFocusedPane(*session);
  statusBar()->showMessage(QString("Opened session: %1").arg(session->displayName), 4000);
  workspaceStore_->save(workspace_->captureState());
}

} // namespace admintools::ui
