#include "storage/WorkspaceStateStore.hpp"

#include <QFile>
#include <QJsonDocument>

namespace admintools::storage {

WorkspaceStateStore::WorkspaceStateStore(QString filePath)
    : filePath_(std::move(filePath)) {}

core::WorkspaceState WorkspaceStateStore::load() const {
  QFile input(filePath_);
  if (!input.exists() || !input.open(QIODevice::ReadOnly)) {
    return {};
  }

  const auto doc = QJsonDocument::fromJson(input.readAll());
  return core::workspaceStateFromJson(doc.object());
}

void WorkspaceStateStore::save(const core::WorkspaceState& state) const {
  QFile output(filePath_);
  if (!output.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
    return;
  }

  output.write(QJsonDocument(core::toJson(state)).toJson(QJsonDocument::Indented));
}

} // namespace admintools::storage
