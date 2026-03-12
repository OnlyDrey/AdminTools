set(ADMTOOLS_SOURCES
  app/main.cpp
  app/Application.cpp
  core/Models.cpp
  ui/MainWindow.cpp
  ui/SessionTreeWidget.cpp
  ui/WorkspaceWidget.cpp
  sessions/SessionManager.cpp
  rdp/RdpController.cpp
  ssh/SshController.cpp
  sftp/SftpController.cpp
  storage/JsonVaultRepository.cpp
  storage/WorkspaceStateStore.cpp
  platform/windows/CredentialStoreWin.cpp
)

set(ADMTOOLS_HEADERS
  app/Application.hpp
  core/Models.hpp
  ui/MainWindow.hpp
  ui/SessionTreeWidget.hpp
  ui/WorkspaceWidget.hpp
  sessions/SessionManager.hpp
  rdp/RdpController.hpp
  ssh/SshController.hpp
  sftp/SftpController.hpp
  storage/JsonVaultRepository.hpp
  storage/WorkspaceStateStore.hpp
  platform/windows/CredentialStoreWin.hpp
)

qt_add_executable(AdminToolsNative WIN32
  ${ADMTOOLS_SOURCES}
  ${ADMTOOLS_HEADERS}
)

target_include_directories(AdminToolsNative PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

target_link_libraries(AdminToolsNative PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets)

if(WIN32)
  target_compile_definitions(AdminToolsNative PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
endif()
