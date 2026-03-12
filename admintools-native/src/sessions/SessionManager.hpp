#pragma once

#include "core/Models.hpp"
#include "storage/JsonVaultRepository.hpp"

#include <QObject>

namespace admintools::sessions {

class SessionManager : public QObject {
  Q_OBJECT

public:
  explicit SessionManager(storage::JsonVaultRepository repository, QObject* parent = nullptr);

  void load();
  void save() const;

  [[nodiscard]] const storage::VaultSnapshot& snapshot() const;
  [[nodiscard]] const core::Session* findSession(const QString& sessionId) const;

signals:
  void snapshotChanged();

private:
  storage::JsonVaultRepository repository_;
  storage::VaultSnapshot snapshot_;
};

} // namespace admintools::sessions
