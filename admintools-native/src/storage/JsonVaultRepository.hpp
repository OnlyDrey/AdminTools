#pragma once

#include "core/Models.hpp"

#include <QString>
#include <QVector>

namespace admintools::storage {

struct VaultSnapshot {
  QVector<core::FolderNode> folders;
  QVector<core::Session> sessions;
  QVector<core::CredentialProfile> credentialProfiles;
  QVector<core::SessionTemplate> templates;
  QVector<core::SmartView> smartViews;
};

class JsonVaultRepository {
public:
  explicit JsonVaultRepository(QString filePath);

  [[nodiscard]] VaultSnapshot load() const;
  void save(const VaultSnapshot& snapshot) const;

  [[nodiscard]] QString filePath() const;

private:
  QString filePath_;
};

} // namespace admintools::storage
