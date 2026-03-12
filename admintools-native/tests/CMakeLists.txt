qt_add_executable(AdminToolsNativeModelTests
  model_roundtrip_tests.cpp
  ../src/core/Models.cpp
)

target_include_directories(AdminToolsNativeModelTests PRIVATE ../src)

target_link_libraries(AdminToolsNativeModelTests PRIVATE Qt6::Core)

add_test(NAME model_roundtrip COMMAND AdminToolsNativeModelTests)
