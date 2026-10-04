import test from 'node:test';
import assert from 'node:assert/strict';
import { AdviceTopic } from '../src/models/entities/AdviceTopic.entity';
import { AdviceItem } from '../src/models/entities/AdviceItem.entity';
import { AdviceSource } from '../src/models/entities/AdviceSource.entity';
import { TopicType, RiskLevel } from '../src/models/entities/advice.enums';

test('Advice entities can be instantiated with relational structures', () => {
  const topic = new AdviceTopic();
  topic.id = 1;
  topic.slug = 'children';
  topic.titleVi = 'Trẻ em';
  topic.topicType = TopicType.TARGET_GROUP;
  topic.riskLevel = RiskLevel.HIGH;

  const item = new AdviceItem();
  item.id = 10;
  item.contentVi = 'Kiểm tra AQI';
  item.topic = topic;

  const source = new AdviceSource();
  source.code = 'S1';
  source.title = 'WHO Guide';
  topic.sources = [source];

  assert.equal(topic.slug, 'children');
  assert.equal(item.topic.id, 1);
  assert.equal(topic.sources.length, 1);
  assert.equal(topic.sources[0].code, 'S1');
});
