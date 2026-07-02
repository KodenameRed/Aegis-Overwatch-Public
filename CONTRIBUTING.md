# Contributing to Aegis Overwatch

Thank you for your interest in hardening the Aegis Overwatch framework! 

As an Open-Core enterprise tool, we maintain strict architectural standards. To ensure your Pull Request (PR) is reviewed and merged, please adhere to the following rules of engagement:

## 🏛️ Architectural Directives

1. **The Black Boxes are Immutable:** The core mathematical heuristics and network scanning engines are compiled Cython binaries (`.pyd`). **Do not** submit PRs attempting to decompile, reverse-engineer, or bypass the `aegis_dna_extractor` or `c2_socket_core`. If you have a suggestion for the core ML logic, open an Issue for discussion with the Lead Architect first.

2. **The Orchestrator is the Hub:**
   Modifications to `Orchestration_Layer.py` are welcome, particularly regarding UI/UX enhancements, new API routes, or efficiency improvements in the FastAPI backend. 

3. **Respect the Semantic Theme:**
   If you are adding visual components to the dashboard, you must utilize the existing CSS root variables (e.g., `--bg`, `--panel`, `--border`) to maintain the dark-mode aesthetic. 

## 🧪 Testing Requirements

Before submitting a PR, you must validate your code against the internal testing simulator:
1. Run `python aegis-apt-sim.py`.
2. Verify that your changes do not break the API ingest routes (`/sysmon`, `/drift`, `/gateway_report`).
3. Ensure the UI correctly flags and scores the simulated MITRE ATT&CK techniques without throwing console errors.

## 📥 Pull Request Process
1. Fork the repository and create a new branch (`feature/your-feature-name`).
2. Write clean, heavily commented Python code.
3. Submit the PR with a clear summary of the problem you are solving and the exact testing steps you took.

*By submitting code, you agree to license your contribution under the existing MIT License.*