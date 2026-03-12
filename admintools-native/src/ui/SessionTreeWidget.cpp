#include "ui/SessionTreeWidget.hpp"

#include <QHeaderView>
#include <QTreeWidgetItem>

namespace admintools::ui {

SessionTreeWidget::SessionTreeWidget(QWidget* parent) : QTreeWidget(parent) {
  setHeaderHidden(true);
  header()->setStretchLastSection(true);
  connect(this, &QTreeWidget::itemDoubleClicked, this, &SessionTreeWidget::onItemActivated);
}

void SessionTreeWidget::setSnapshot(const storage::VaultSnapshot& snapshot) {
  clear();

  QHash<QString, QTreeWidgetItem*> folderMap;
  for (const auto& folder : snapshot.folders) {
    auto* item = new QTreeWidgetItem({folder.displayName});
    item->setData(0, Qt::UserRole, folder.id);
    folderMap.insert(folder.id, item);

    if (folder.parentId.isEmpty() || !folderMap.contains(folder.parentId)) {
      addTopLevelItem(item);
    } else {
      folderMap[folder.parentId]->addChild(item);
    }
  }

  if (snapshot.folders.empty()) {
    auto* root = new QTreeWidgetItem({"Sessions"});
    addTopLevelItem(root);
    folderMap.insert("root", root);
  }

  auto* attachTo = folderMap.isEmpty() ? invisibleRootItem() : folderMap.begin().value();
  for (const auto& session : snapshot.sessions) {
    auto* item = new QTreeWidgetItem({session.displayName});
    item->setData(0, Qt::UserRole + 1, session.id);
    attachTo->addChild(item);
  }

  expandAll();
}

void SessionTreeWidget::onItemActivated(QTreeWidgetItem* item, int column) {
  Q_UNUSED(column)
  const auto sessionId = item->data(0, Qt::UserRole + 1).toString();
  if (!sessionId.isEmpty()) {
    emit sessionActivated(sessionId);
  }
}

} // namespace admintools::ui
