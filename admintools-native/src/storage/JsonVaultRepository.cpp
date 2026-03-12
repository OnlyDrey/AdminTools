#include "storage/JsonVaultRepository.hpp"

#include <QFile>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>

namespace admintools::storage {

JsonVaultRepository::JsonVaultRepository(QString filePath)
    : filePath_(std::move(filePath)) {}

VaultSnapshot JsonVaultRepository::load() const {
  VaultSnapshot snapshot;
  QFile input(filePath_);
  if (!input.exists() || !input.open(QIODevice::ReadOnly)) {
    return snapshot;
  }

  const auto document = QJsonDocument::fromJson(input.readAll());
  const auto root = document.object();

  for (const auto& value : root["folders"].toArray()) {
    snapshot.folders.push_back(core::folderNodeFromJson(value.toObject()));
  }

  for (const auto& value : root["sessions"].toArray()) {
    snapshot.sessions.push_back(core::sessionFromJson(value.toObject()));
  }

  for (const auto& value : root["credentialProfiles"].toArray()) {
    snapshot.credentialProfiles.push_back(core::credentialProfileFromJson(value.toObject()));
  }

  return snapshot;
}

void JsonVaultRepository::save(const VaultSnapshot& snapshot) const {
  QJsonArray folders;
  for (const auto& folder : snapshot.folders) {
    folders.append(core::toJson(folder));
  }

  QJsonArray sessions;
  for (const auto& session : snapshot.sessions) {
    sessions.append(core::toJson(session));
  }

  QJsonArray credentials;
  for (const auto& credential : snapshot.credentialProfiles) {
    credentials.append(core::toJson(credential));
  }

  const QJsonObject root{{"schemaVersion", 1},
                         {"folders", folders},
                         {"sessions", sessions},
                         {"credentialProfiles", credentials}};

  QFile output(filePath_);
  if (!output.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
    return;
  }

  output.write(QJsonDocument(root).toJson(QJsonDocument::Indented));
}

QString JsonVaultRepository::filePath() const { return filePath_; }

} // namespace admintools::storage
