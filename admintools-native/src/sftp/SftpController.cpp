#include "sftp/SftpController.hpp"

namespace admintools::sftp {

bool SftpController::connect(const core::Session& session) {
  Q_UNUSED(session)
  return true;
}

QStringList SftpController::listRemote(const QString& sessionId, const QString& remotePath) const {
  Q_UNUSED(sessionId)
  return {remotePath + "/example.log", remotePath + "/backup"};
}

bool SftpController::upload(const QString& sessionId, const QString& localPath,
                            const QString& remotePath) const {
  Q_UNUSED(sessionId)
  Q_UNUSED(localPath)
  Q_UNUSED(remotePath)
  return true;
}

bool SftpController::download(const QString& sessionId, const QString& remotePath,
                              const QString& localPath) const {
  Q_UNUSED(sessionId)
  Q_UNUSED(remotePath)
  Q_UNUSED(localPath)
  return true;
}

} // namespace admintools::sftp
