#include "sessions/SessionManager.hpp"

namespace admintools::sessions {

SessionManager::SessionManager(storage::JsonVaultRepository repository, QObject* parent)
    : QObject(parent), repository_(std::move(repository)) {}

void SessionManager::load() {
  snapshot_ = repository_.load();
  emit snapshotChanged();
}

void SessionManager::save() const { repository_.save(snapshot_); }

const storage::VaultSnapshot& SessionManager::snapshot() const { return snapshot_; }

const core::Session* SessionManager::findSession(const QString& sessionId) const {
  for (const auto& session : snapshot_.sessions) {
    if (session.id == sessionId) {
      return &session;
    }
  }
  return nullptr;
}

} // namespace admintools::sessions
