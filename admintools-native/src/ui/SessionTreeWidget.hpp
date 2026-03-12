#pragma once

#include "storage/JsonVaultRepository.hpp"

#include <QTreeWidget>

namespace admintools::ui {

class SessionTreeWidget : public QTreeWidget {
  Q_OBJECT

public:
  explicit SessionTreeWidget(QWidget* parent = nullptr);

  void setSnapshot(const storage::VaultSnapshot& snapshot);

signals:
  void sessionActivated(const QString& sessionId);

private:
  void onItemActivated(QTreeWidgetItem* item, int column);
};

} // namespace admintools::ui
