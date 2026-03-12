#pragma once

#include "core/Models.hpp"

#include <QString>
#include <QStringList>

namespace admintools::sftp {

class SftpController {
public:
  [[nodiscard]] bool connect(const core::Session& session);
  [[nodiscard]] QStringList listRemote(const QString& sessionId, const QString& remotePath) const;
  [[nodiscard]] bool upload(const QString& sessionId, const QString& localPath,
                            const QString& remotePath) const;
  [[nodiscard]] bool download(const QString& sessionId, const QString& remotePath,
                              const QString& localPath) const;
};

} // namespace admintools::sftp
