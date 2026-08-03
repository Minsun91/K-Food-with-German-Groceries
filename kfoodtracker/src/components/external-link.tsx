import { Link } from 'expo-router';
import * as React from 'react';

export function ExternalLink(props: React.ComponentProps<typeof Link>) {
  return <Link {...props} />;
}