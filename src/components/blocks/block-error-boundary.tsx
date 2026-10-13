"use client";

import { Component, type ReactNode } from "react";
import { InvalidBlock } from "./invalid-block";

/** Keeps one broken block from taking the whole lesson down. */
export class BlockErrorBoundary extends Component<
  { blockId: string; type: string; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(
      `Block ${this.props.blockId} (${this.props.type}) crashed:`,
      error,
    );
  }

  render() {
    if (this.state.error) {
      return (
        <InvalidBlock
          blockId={this.props.blockId}
          type={this.props.type}
          reason={this.state.error.message}
        />
      );
    }
    return this.props.children;
  }
}
