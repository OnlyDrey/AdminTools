#pragma once

#include <QString>

#include <optional>

namespace admintools::platform::windows {

class CredentialStoreWin {
public:
  [[nodiscard]] bool writeSecret(const QString& targetName, const QString& username,
                                 const QString& secret) const;
  [[nodiscard]] std::optional<QString> readSecret(const QString& targetName) const;
  [[nodiscard]] bool deleteSecret(const QString& targetName) const;
};

} // namespace admintools::platform::windows
