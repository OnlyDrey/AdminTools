#pragma once

#include "core/Models.hpp"

#include <QString>

namespace admintools::rdp {

struct RdpCapabilities {
  bool embeddedAvailable{false};
  bool resizeSupport{false};
  bool commandInjectionSupport{false};
  bool clipboardSupport{false};
  QString backend;
  QString notes;
};

class RdpController {
public:
  [[nodiscard]] RdpCapabilities capabilities() const;
  [[nodiscard]] bool launchEmbedded(const core::Session& session) const;
  [[nodiscard]] bool launchExternalFallback(const core::Session& session) const;
};

} // namespace admintools::rdp
