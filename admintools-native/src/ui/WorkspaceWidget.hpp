#pragma once

#include "core/Models.hpp"

#include <QSplitter>

class QTabWidget;
class QTextEdit;

namespace admintools::ui {

class WorkspaceWidget : public QSplitter {
  Q_OBJECT

public:
  explicit WorkspaceWidget(QWidget* parent = nullptr);

  void openSessionInFocusedPane(const core::Session& session);
  void splitRight();
  void splitDown();

  [[nodiscard]] core::WorkspaceState captureState() const;
  void restoreStateFromModel(const core::WorkspaceState& state);

private:
  QTabWidget* createPane();
  QTabWidget* focusedPane() const;
  static QWidget* makeSessionView(const core::Session& session);
};

} // namespace admintools::ui
