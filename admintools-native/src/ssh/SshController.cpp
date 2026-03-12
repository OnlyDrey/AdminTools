#include "ssh/SshController.hpp"

#include <QHash>

namespace admintools::ssh {
namespace {
QHash<QString, QString> kSessionStatuses;
}

bool SshController::connect(const core::Session& session) {
  kSessionStatuses.insert(session.id,
                          QString("connected (stub via planned libssh2 backend) to %1:%2")
                              .arg(session.host)
                              .arg(session.port));
  return true;
}

void SshController::disconnect(const QString& sessionId) {
  kSessionStatuses.insert(sessionId, "disconnected");
}

QString SshController::statusFor(const QString& sessionId) const {
  return kSessionStatuses.value(sessionId, "unknown");
}

} // namespace admintools::ssh
