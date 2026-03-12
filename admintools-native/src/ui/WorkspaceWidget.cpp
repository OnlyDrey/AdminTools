#include "ui/WorkspaceWidget.hpp"

#include <QApplication>
#include <QLabel>
#include <QTabBar>
#include <QTabWidget>
#include <QVBoxLayout>

namespace admintools::ui {

WorkspaceWidget::WorkspaceWidget(QWidget* parent) : QSplitter(Qt::Horizontal, parent) {
  setChildrenCollapsible(false);
  createPane();
}

void WorkspaceWidget::openSessionInFocusedPane(const core::Session& session) {
  auto* pane = focusedPane();
  auto* view = makeSessionView(session);
  pane->addTab(view, session.displayName);
  pane->setCurrentWidget(view);
}

void WorkspaceWidget::splitRight() {
  setOrientation(Qt::Horizontal);
  auto* pane = createPane();
  setSizes({width() / 2, width() / 2});
  pane->setFocus();
}

void WorkspaceWidget::splitDown() {
  setOrientation(Qt::Vertical);
  auto* pane = createPane();
  setSizes({height() / 2, height() / 2});
  pane->setFocus();
}

core::WorkspaceState WorkspaceWidget::captureState() const {
  core::WorkspaceState state;
  state.focusedPaneId = QString("pane-%1").arg(indexOf(const_cast<QTabWidget*>(focusedPane())));

  for (int i = 0; i < count(); ++i) {
    auto* pane = qobject_cast<QTabWidget*>(widget(i));
    if (pane == nullptr) {
      continue;
    }

    core::WorkspacePaneState paneState;
    paneState.paneId = QString("pane-%1").arg(i);
    paneState.orientation = orientation() == Qt::Horizontal ? "horizontal" : "vertical";

    for (int t = 0; t < pane->count(); ++t) {
      core::WorkspaceTabState tabState;
      tabState.tabId = QString("pane-%1-tab-%2").arg(i).arg(t);
      tabState.sessionId = pane->widget(t)->property("sessionId").toString();
      tabState.title = pane->tabText(t);
      tabState.active = pane->currentIndex() == t;
      paneState.tabs.push_back(tabState);
      if (tabState.active) {
        paneState.activeTabId = tabState.tabId;
      }
    }

    state.panes.push_back(paneState);
  }

  return state;
}

void WorkspaceWidget::restoreStateFromModel(const core::WorkspaceState& state) {
  Q_UNUSED(state)
}

QTabWidget* WorkspaceWidget::createPane() {
  auto* pane = new QTabWidget(this);
  pane->setTabsClosable(true);
  pane->setMovable(true);
  addWidget(pane);
  connect(pane, &QTabWidget::tabCloseRequested, pane, [pane](int index) {
    auto* widget = pane->widget(index);
    pane->removeTab(index);
    widget->deleteLater();
  });
  return pane;
}

QTabWidget* WorkspaceWidget::focusedPane() const {
  if (auto* focus = qobject_cast<QTabWidget*>(QApplication::focusWidget()); focus != nullptr) {
    return focus;
  }

  for (int i = 0; i < count(); ++i) {
    if (auto* pane = qobject_cast<QTabWidget*>(widget(i)); pane != nullptr) {
      return pane;
    }
  }

  return nullptr;
}

QWidget* WorkspaceWidget::makeSessionView(const core::Session& session) {
  auto* panel = new QWidget();
  auto* layout = new QVBoxLayout(panel);
  auto* title = new QLabel(QString("%1 (%2:%3)").arg(session.displayName).arg(session.host).arg(session.port));
  title->setObjectName("sessionTitle");
  auto* body = new QLabel("Session host view placeholder. SSH terminal, SFTP panel, or embedded RDP surface is protocol-dependent.");
  body->setWordWrap(true);
  layout->addWidget(title);
  layout->addWidget(body);
  panel->setProperty("sessionId", session.id);
  return panel;
}

} // namespace admintools::ui
