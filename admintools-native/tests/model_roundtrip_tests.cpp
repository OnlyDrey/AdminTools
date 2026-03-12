#include "core/Models.hpp"

#include <QCoreApplication>

int main(int argc, char** argv) {
  QCoreApplication app(argc, argv);

  admintools::core::Session session;
  session.id = "session-1";
  session.displayName = "example";
  session.protocol = admintools::core::SessionProtocol::Ssh;
  session.host = "localhost";
  session.port = 22;

  const auto json = admintools::core::toJson(session);
  const auto restored = admintools::core::sessionFromJson(json);

  if (restored.id != session.id || restored.host != session.host || restored.port != session.port) {
    return 1;
  }

  return 0;
}
