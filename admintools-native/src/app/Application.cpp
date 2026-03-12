#include "app/Application.hpp"

#include <QDir>
#include <QFile>
#include <QStandardPaths>

namespace admintools::app {
namespace {

QString ensureAppDataPath() {
  const auto base = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
  QDir dir(base);
  if (!dir.exists()) {
    dir.mkpath(".");
  }
  return dir.absolutePath();
}

void ensureSeedVault(const QString& vaultPath) {
  QFile existing(vaultPath);
  if (existing.exists()) {
    return;
  }

  storage::JsonVaultRepository repository(vaultPath);
  storage::VaultSnapshot seed;

  core::FolderNode rootFolder;
  rootFolder.id = "root";
  rootFolder.displayName = "Default";

  core::Session sshSession;
  sshSession.id = "ssh-local";
  sshSession.folderId = "root";
  sshSession.displayName = "Local SSH";
  sshSession.protocol = core::SessionProtocol::Ssh;
  sshSession.host = "127.0.0.1";
  sshSession.port = 22;

  core::Session rdpSession;
  rdpSession.id = "rdp-lab";
  rdpSession.folderId = "root";
  rdpSession.displayName = "Lab RDP";
  rdpSession.protocol = core::SessionProtocol::Rdp;
  rdpSession.host = "10.0.0.30";
  rdpSession.port = 3389;

  seed.folders.push_back(rootFolder);
  seed.sessions.push_back(sshSession);
  seed.sessions.push_back(rdpSession);
  repository.save(seed);
}

} // namespace

Application::Application(int& argc, char** argv)
    : qapp_(argc, argv),
      repository_(ensureAppDataPath() + "/vault.json"),
      sessionManager_(repository_),
      workspaceStore_(ensureAppDataPath() + "/workspace.json"),
      mainWindow_(&sessionManager_, &workspaceStore_) {
  ensureSeedVault(repository_.filePath());
  sessionManager_.load();
}

int Application::run() {
  mainWindow_.show();
  return qapp_.exec();
}

} // namespace admintools::app
