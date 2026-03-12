#include "rdp/RdpController.hpp"

#include <QProcess>

namespace admintools::rdp {

RdpCapabilities RdpController::capabilities() const {
#ifdef _WIN32
  return {.embeddedAvailable = false,
          .resizeSupport = false,
          .commandInjectionSupport = false,
          .clipboardSupport = true,
          .backend = "MSTSC ActiveX planned",
          .notes = "Phase-1 keeps an external mstsc fallback while a QAxWidget-hosted control is implemented."};
#else
  return {.embeddedAvailable = false,
          .resizeSupport = false,
          .commandInjectionSupport = false,
          .clipboardSupport = false,
          .backend = "Unsupported",
          .notes = "RDP is Windows-only in the native rewrite."};
#endif
}

bool RdpController::launchEmbedded(const core::Session& session) const {
  Q_UNUSED(session)
  return false;
}

bool RdpController::launchExternalFallback(const core::Session& session) const {
#ifdef _WIN32
  QStringList args;
  args << "/v:" + session.host;
  return QProcess::startDetached("mstsc", args);
#else
  Q_UNUSED(session)
  return false;
#endif
}

} // namespace admintools::rdp
