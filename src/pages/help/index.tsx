import { Card } from '@heroui/react';
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

const HelpPage = () => {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Find answers to common questions and get support
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Getting Started */}
        <Card className="border border-border">
          <Card.Header className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <BookOpenIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Getting Started</h2>
            </div>
          </Card.Header>
          <Card.Content className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Quick Start Guide</h3>
                <p className="text-sm text-muted-foreground">
                  Learn the basics of using the application and navigate through the main features.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">User Manual</h3>
                <p className="text-sm text-muted-foreground">
                  Comprehensive documentation covering all features and functionalities.
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Frequently Asked Questions */}
        <Card className="border border-border">
          <Card.Header className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <QuestionMarkCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">FAQs</h2>
            </div>
          </Card.Header>
          <Card.Content className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Common Questions</h3>
                <p className="text-sm text-muted-foreground">
                  Find answers to frequently asked questions about the application.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Troubleshooting</h3>
                <p className="text-sm text-muted-foreground">
                  Solutions to common issues and problems you might encounter.
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Contact Support */}
        <Card className="border border-border">
          <Card.Header className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Contact Support</h2>
            </div>
          </Card.Header>
          <Card.Content className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Live Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Chat with our support team in real-time for immediate assistance.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Support Ticket</h3>
                <p className="text-sm text-muted-foreground">
                  Submit a support ticket and we'll get back to you as soon as possible.
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Email Support */}
        <Card className="border border-border">
          <Card.Header className="pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <EnvelopeIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Email Support</h2>
            </div>
          </Card.Header>
          <Card.Content className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Email Us</h3>
                <p className="text-sm text-muted-foreground">
                  Send us an email at{' '}
                  <a 
                    href="mailto:support@example.com" 
                    className="text-primary hover:underline"
                  >
                    support@example.com
                  </a>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Response Time</h3>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24 hours during business days.
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Additional Resources */}
      <Card className="border border-border">
        <Card.Header className="pb-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Additional Resources</h2>
        </Card.Header>
        <Card.Content className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">Video Tutorials</h3>
              <p className="text-xs text-muted-foreground">
                Watch step-by-step video guides to learn how to use the application.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">API Documentation</h3>
              <p className="text-xs text-muted-foreground">
                Technical documentation for developers and integrators.
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-2">Community Forum</h3>
              <p className="text-xs text-muted-foreground">
                Join our community to ask questions and share knowledge.
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default HelpPage;




