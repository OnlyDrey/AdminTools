#pragma once

#include "sessions/SessionManager.hpp"
#include "storage/WorkspaceStateStore.hpp"
#include "ui/MainWindow.hpp"

#include <QApplication>

namespace admintools::app {

class Application {
public:
  Application(int& argc, char** argv);
  int run();

private:
  QApplication qapp_;
  storage::JsonVaultRepository repository_;
  sessions::SessionManager sessionManager_;
  storage::WorkspaceStateStore workspaceStore_;
  ui::MainWindow mainWindow_;
};

} // namespace admintools::app
