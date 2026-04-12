from __future__ import annotations

import sys
from pathlib import Path

# 中文注释：统一把仓库根目录注入 sys.path，确保直接执行 pytest 时也能导入 agent 包。
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
