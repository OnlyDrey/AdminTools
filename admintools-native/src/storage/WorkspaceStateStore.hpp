#pragma once

#include "core/Models.hpp"

#include <QString>

namespace admintools::storage {

class WorkspaceStateStore {
public:
  explicit WorkspaceStateStore(QString filePath);

  [[nodiscard]] core::WorkspaceState load() const;
  void save(const core::WorkspaceState& state) const;

private:
  QString filePath_;
};

} // namespace admintools::storage
