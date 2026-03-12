#include "app/Application.hpp"

int main(int argc, char** argv) {
  admintools::app::Application application(argc, argv);
  return application.run();
}
