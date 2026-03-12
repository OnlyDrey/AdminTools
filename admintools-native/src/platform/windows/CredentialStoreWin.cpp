#include "platform/windows/CredentialStoreWin.hpp"

#ifdef _WIN32
#include <Windows.h>
#include <wincred.h>
#endif

namespace admintools::platform::windows {

bool CredentialStoreWin::writeSecret(const QString& targetName, const QString& username,
                                     const QString& secret) const {
#ifdef _WIN32
  auto targetWide = targetName.toStdWString();
  auto userWide = username.toStdWString();
  auto secretBytes = secret.toUtf16();

  CREDENTIALW credential{};
  credential.Type = CRED_TYPE_GENERIC;
  credential.TargetName = const_cast<wchar_t*>(targetWide.c_str());
  credential.UserName = const_cast<wchar_t*>(userWide.c_str());
  credential.CredentialBlobSize = static_cast<DWORD>(secret.size() * sizeof(char16_t));
  credential.CredentialBlob = reinterpret_cast<LPBYTE>(secretBytes);
  credential.Persist = CRED_PERSIST_LOCAL_MACHINE;

  return CredWriteW(&credential, 0) != 0;
#else
  Q_UNUSED(targetName)
  Q_UNUSED(username)
  Q_UNUSED(secret)
  return false;
#endif
}

std::optional<QString> CredentialStoreWin::readSecret(const QString& targetName) const {
#ifdef _WIN32
  auto targetWide = targetName.toStdWString();
  PCREDENTIALW credential = nullptr;

  if (CredReadW(targetWide.c_str(), CRED_TYPE_GENERIC, 0, &credential) == 0) {
    return std::nullopt;
  }

  const auto length = static_cast<int>(credential->CredentialBlobSize / sizeof(char16_t));
  auto value = QString::fromUtf16(reinterpret_cast<char16_t*>(credential->CredentialBlob), length);
  CredFree(credential);
  return value;
#else
  Q_UNUSED(targetName)
  return std::nullopt;
#endif
}

bool CredentialStoreWin::deleteSecret(const QString& targetName) const {
#ifdef _WIN32
  auto targetWide = targetName.toStdWString();
  return CredDeleteW(targetWide.c_str(), CRED_TYPE_GENERIC, 0) != 0;
#else
  Q_UNUSED(targetName)
  return false;
#endif
}

} // namespace admintools::platform::windows
