#pragma once

#include "core/Models.hpp"

#include <QString>

namespace admintools::ssh {

class SshController {
public:
  [[nodiscard]] bool connect(const core::Session& session);
  void disconnect(const QString& sessionId);
  [[nodiscard]] QString statusFor(const QString& sessionId) const;
};

} // namespace admintools::ssh
