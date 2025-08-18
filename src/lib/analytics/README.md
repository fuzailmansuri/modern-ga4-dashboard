# AnalyticsQueryProcessor Implementation

## Overview

The `AnalyticsQueryProcessor` class has been implemented to fulfill task 3.1 from the analytics chat interface specification. This class processes natural language queries and prepares structured context for AI consumption.

## Features Implemented

### 1. Query Intent Classification ✅
The processor can identify different types of analytics questions:
- **metric_inquiry**: Questions about specific metrics (users, sessions, revenue, etc.)
- **brand_comparison**: Comparative questions between brands/properties
- **performance_ranking**: Questions about top performers or rankings
- **trend_analysis**: Questions about trends and changes over time
- **time_period_analysis**: Questions about specific time periods
- **general_insight**: Broad questions requiring general insights

### 2. Entity Extraction ✅
The processor extracts key entities from natural language queries:
- **Metrics**: Identifies 10+ common GA4 metrics with multiple variations
  - Users (users, visitors, people, audience)
  - Sessions (sessions, visits)
  - Page Views (pageviews, views, screens)
  - Bounce Rate (bounce rate, bounce %)
  - Session Duration (session duration, time on site)
  - Revenue (revenue, sales, money, earnings)
  - Conversions (conversions, goals)
  - Engagement Rate (engagement, engaged users)
  - New Users (new users, first time users)
  - Returning Users (returning users, repeat users)

- **Time References**: Recognizes temporal patterns
  - Relative time (today, yesterday, this week, last month)
  - Specific periods (past 30 days, 5 days ago)
  - Time ranges (this year, last year)

- **Comparison Types**: Identifies comparison patterns
  - vs/versus comparisons
  - ranking/best performer queries
  - trend analysis requests

- **Brand Names**: Extracts brand/property names from queries
  - Quoted brand names ("Brand A")
  - Capitalized proper nouns (excluding common words)

### 3. Context Management ✅
The processor builds comprehensive context for AI consumption:
- **Conversation History**: Maintains context from previous messages
- **Property Summaries**: Includes key metrics and trends for each property
- **Aggregated Metrics**: Provides overall performance numbers
- **Trend Analysis**: Includes trend information when available
- **Comparison Data**: Adds comparison insights between properties
- **Structured Instructions**: Provides clear guidance for AI responses

### 4. Conversation Memory ✅
The processor enhances queries with conversation history:
- Inherits brand context from previous messages
- Maintains metric context for follow-up questions
- Builds on previous conversation context

## Requirements Compliance

### Requirement 1.1 ✅
- **WHEN a user types a question about brand performance THEN the system SHALL process the query**
- ✅ Implemented: `processQuery()` method handles all natural language queries

### Requirement 1.2 ✅
- **WHEN a user asks about specific metrics THEN the system SHALL provide accurate data**
- ✅ Implemented: Comprehensive metric extraction with 10+ metric types and variations

### Requirement 2.2 ✅
- **WHEN a user asks a follow-up question THEN the system SHALL maintain context**
- ✅ Implemented: `enhanceEntitiesWithHistory()` method maintains conversation context

## Key Methods

### `processQuery(query, context, conversationHistory)`
Main entry point that:
1. Extracts intent and entities
2. Enhances entities with conversation history
3. Filters relevant data
4. Builds structured context prompt

### `extractIntent(query)`
Classifies the query into one of 6 intent categories using pattern matching.

### `extractEntities(query)`
Extracts metrics, time references, brands, and comparison types from the query.

### `buildContextPrompt(query, context, conversationHistory)`
Creates a comprehensive, structured prompt for AI consumption including:
- Conversation context
- Current query
- Analytics data context
- Property summaries
- Aggregated metrics
- Trends and comparisons
- Clear instructions for AI

## Usage Example

```typescript
import { AnalyticsQueryProcessor } from './AnalyticsQueryProcessor';

const processor = new AnalyticsQueryProcessor();

// Process a user query
const result = await processor.processQuery(
  "How are Brand A users trending compared to last month?",
  analyticsContext,
  conversationHistory
);

console.log(result.intent); // 'trend_analysis'
console.log(result.entities.metrics); // ['users']
console.log(result.entities.brands); // ['Brand A']
console.log(result.entities.timeReferences); // ['last_month']
```

## Files Created

1. **`AnalyticsQueryProcessor.ts`** - Main implementation
2. **`example-usage.ts`** - Comprehensive usage examples
3. **`validation.ts`** - Validation script to verify functionality
4. **`README.md`** - This documentation

## Testing

The implementation includes comprehensive validation through:
- Intent classification tests (6 different intents)
- Entity extraction tests (metrics, time references, comparisons)
- Context prompt building verification
- Conversation history enhancement testing

Run validation with:
```typescript
import { validateQueryProcessor } from './validation';
validateQueryProcessor(); // Returns true if all tests pass
```

## Integration Points

The processor integrates with:
- **Chat Types** (`~/types/chat.ts`) - Uses all defined interfaces
- **Analytics Types** (`~/types/analytics.ts`) - Processes analytics data
- **Context Manager** - Works with `AnalyticsContextManager` for data aggregation
- **Gemini AI Service** - Provides structured prompts for AI consumption

## Next Steps

This implementation is ready for integration with:
1. The chat interface component (task 1)
2. The enhanced Gemini AI service (task 4.1)
3. The API endpoints (task 5.1)

The processor provides the foundation for natural language query understanding in the analytics chat interface.