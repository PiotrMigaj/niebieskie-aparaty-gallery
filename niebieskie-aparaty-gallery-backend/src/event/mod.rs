// In Rust, a directory-based module needs a `mod.rs` file to act as its "entry point".
// This file tells the compiler which sub-modules exist inside the `event/` directory.
// `pub mod` makes the sub-module visible to code outside of `event/`.

pub mod model;
pub mod repository;
