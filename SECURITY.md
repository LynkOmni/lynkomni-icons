# Security

This repository publishes artwork that every LynkOmni product loads, so a tampered file would appear
everywhere. We treat it as security-relevant.

## What protects it

- Every SVG is checked on every pull request. Scripts, event handlers, external links, embedded images,
  fonts and text elements are rejected.
- The platform repo pins an exact release and a checksum for every file (`brand.lock.json`), and fails
  its build if a file changes.
- Products never load brand files from the internet at run time. They bundle them, so they work offline
  and cannot be swapped remotely.
- Merchant-uploaded logos are a separate path and never use SVG.

## Reporting a problem

Please report a suspected vulnerability privately using GitHub's **Report a vulnerability** option on the
Security tab of this repository (an owner must switch on private vulnerability reporting under
Settings > Code security). Do not open a public issue for it.
