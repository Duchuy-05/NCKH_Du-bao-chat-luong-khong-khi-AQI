"""Seed health-advice topics, bilingual items, sources, and their links.

Revision ID: 20261021_0003
Revises: 20261021_0002
"""
from alembic import op
from sqlalchemy import text

revision = "20261021_0003"
down_revision = "20261021_0002"
branch_labels = None
depends_on = None

TOPICS = [('children', 'target_group', 'Trẻ em & Học sinh', None, 'Baby', 'high', 1),
 ('pregnant', 'target_group', 'Phụ nữ mang thai', None, 'Baby', 'high', 2),
 ('elderly', 'target_group', 'Người cao tuổi', None, 'HeartPulse', 'high', 3),
 ('respiratory', 'target_group', 'Người mắc hen suyễn / COPD / Hô hấp', None, 'Activity', 'critical', 4),
 ('cardiovascular', 'target_group', 'Người mắc bệnh tim mạch', None, 'Heart', 'critical', 5),
 ('athletes', 'target_group', 'Người chạy bộ, đạp xe & Thể thao ngoài trời', None, 'Bike', 'moderate', 6),
 ('outdoor_workers', 'target_group', 'Người lao động ngoài trời', None, 'Bike', 'moderate', 7),
 ('families', 'target_group', 'Gia đình có trẻ nhỏ / Người bệnh nền', None, 'Users', 'moderate', 8)]

TOPIC_TITLES_EN = [('children', 'Children and students'),
 ('pregnant', 'Pregnant women'),
 ('elderly', 'Older adults'),
 ('respiratory', 'People with asthma, COPD, or respiratory diseases'),
 ('cardiovascular', 'People with cardiovascular disease'),
 ('athletes', 'Runners, cyclists, and outdoor exercisers'),
 ('outdoor_workers', 'Outdoor workers'),
 ('families',
  'Households with young children, the elderly, or individuals with underlying health conditions')]

ITEMS = [('children',
  1,
  'Kiểm tra AQI trước giờ thể dục, vui chơi hoặc hoạt động ngoài trời.',
  'Check the AQI before physical education classes, playtime, or outdoor activities.'),
 ('children',
  2,
  'Khi AQI tăng, giảm thời gian chạy nhảy hoặc vận động mạnh kéo dài.',
  'When the AQI rises, reduce the duration of running, jumping, or vigorous physical activity.'),
 ('children',
  3,
  'Tránh cho trẻ vận động lâu gần đường giao thông đông, công trường hoặc nguồn khói bụi.',
  'Avoid prolonged physical activity near busy roads, construction sites, or sources of smoke and dust.'),
 ('children',
  4,
  'Khi AQI xấu, ưu tiên vui chơi và hoạt động thể chất trong nhà.',
  'When air quality is poor, prioritize indoor play and physical activities.'),
 ('children',
  5,
  'Trẻ mắc hen hoặc bệnh hô hấp cần tuân thủ kế hoạch điều trị do bác sĩ hướng dẫn.',
  'Children with asthma or respiratory conditions must adhere to their doctor-prescribed treatment plan.'),
 ('children',
  6,
  'Theo dõi ho, khò khè, khó thở, đau/tức ngực hoặc giảm khả năng vận động so với bình thường.',
  'Monitor for coughing, wheezing, shortness of breath, chest pain/tightness, or reduced physical stamina '
  'compared to normal.'),
 ('children',
  7,
  'Nếu trẻ có triệu chứng khi đang hoạt động, dừng hoặc giảm vận động và đưa trẻ đến nơi có không khí tốt '
  'hơn.',
  'If symptoms occur during activity, stop or reduce the activity and move the child to an area with better '
  'air quality.'),
 ('children',
  8,
  'Không để trẻ tiếp xúc với khói thuốc lá trong nhà hoặc trên xe.',
  'Do not expose children to tobacco smoke indoors or inside vehicles.'),
 ('children',
  9,
  'Nhà trường nên có phương án riêng cho học sinh thuộc nhóm bệnh tim/phổi khi AQI xấu.',
  'Schools should have specific plans for students with heart or lung conditions when air quality is poor.'),
 ('children',
  10,
  'Khi AQI nguy hại kéo dài, thực hiện hướng dẫn của cơ quan y tế/giáo dục về điều chỉnh hoạt động học tập.',
  'During prolonged periods of hazardous air quality, follow guidelines from health or education authorities '
  'regarding adjustments to academic activities.'),
 ('pregnant',
  1,
  'Theo dõi AQI trước khi ra ngoài, đặc biệt khi dự báo ô nhiễm kéo dài.',
  'Check the AQI before going outdoors, especially when prolonged pollution is forecast.'),
 ('pregnant',
  2,
  'Hạn chế thời gian ở nơi giao thông đông, công trường hoặc khu vực có nhiều khói bụi khi AQI cao.',
  'Limit time spent in areas with heavy traffic, construction sites, or high levels of smoke and dust when '
  'the AQI is high.'),
 ('pregnant',
  3,
  'Ưu tiên hoạt động trong nhà khi chất lượng không khí ở mức xấu, rất xấu hoặc nguy hại.',
  'Prioritize indoor activities when air quality is poor, very poor, or hazardous.'),
 ('pregnant',
  4,
  'Nếu cần ra ngoài, chọn thời điểm và tuyến đường có mức ô nhiễm thấp hơn.',
  'If going outdoors is necessary, choose times and routes with lower pollution levels.'),
 ('pregnant',
  5,
  'Tránh vận động gắng sức kéo dài trong môi trường ô nhiễm cao.',
  'Avoid prolonged strenuous physical activity in highly polluted environments.'),
 ('pregnant', 6, 'Không hút thuốc và tránh khói thuốc thụ động.', 'Do not smoke and avoid secondhand smoke.'),
 ('pregnant',
  7,
  'Nếu đồng thời có bệnh tim/phổi, áp dụng khuyến cáo thận trọng hơn và tuân thủ chỉ dẫn của bác sĩ.',
  'If you have a pre-existing heart or lung condition, follow stricter precautions and adhere to your '
  "doctor's instructions."),
 ('pregnant',
  8,
  'Nếu xuất hiện khó thở, đau/tức ngực hoặc triệu chứng bất thường rõ rệt, cần được đánh giá y tế.',
  'Seek medical evaluation if you experience shortness of breath, chest pain/tightness, or other '
  'significant, unusual symptoms.'),
 ('elderly',
  1,
  'Theo dõi AQI trước khi đi bộ hoặc tập thể dục ngoài trời.',
  'Check the AQI before walking or exercising outdoors.'),
 ('elderly',
  2,
  'Giảm thời gian vận động ngoài trời khi chất lượng không khí kém hoặc xấu.',
  'Reduce time spent on outdoor physical activity when air quality is poor or unhealthy.'),
 ('elderly',
  3,
  'Tránh tập luyện gần tuyến đường đông xe và khu vực có nhiều bụi.',
  'Avoid exercising near busy roads or dusty areas.'),
 ('elderly',
  4,
  'Ưu tiên vận động nhẹ trong nhà khi AQI rất xấu hoặc nguy hại.',
  'Prioritize light indoor exercise when the AQI is very unhealthy or hazardous.'),
 ('elderly',
  5,
  'Người có bệnh tim/phổi cần dùng thuốc đúng theo chỉ định của bác sĩ.',
  'Individuals with heart or lung conditions must take medications exactly as prescribed.'),
 ('elderly',
  6,
  'Không tự ý tăng, giảm hoặc ngừng thuốc vì AQI thay đổi.',
  'Do not arbitrarily increase, decrease, or stop medication based on AQI fluctuations.'),
 ('elderly',
  7,
  'Theo dõi mệt bất thường, khó thở, hồi hộp hoặc đau/tức ngực.',
  'Monitor for unusual fatigue, shortness of breath, heart palpitations, or chest pain/tightness.'),
 ('elderly',
  8,
  'Chuẩn bị đầy đủ thuốc thường dùng nếu dự báo ô nhiễm kéo dài.',
  'Ensure an adequate supply of regular medications if prolonged pollution is forecast.'),
 ('elderly',
  9,
  'Hạn chế ra ngoài không cần thiết khi AQI ở mức rất xấu hoặc nguy hại.',
  'Limit unnecessary outings when the AQI is at very unhealthy or hazardous levels.'),
 ('elderly',
  10,
  'Nếu triệu chứng bệnh nền tăng nặng, cần đi khám.',
  'Seek medical attention if symptoms of underlying conditions worsen.'),
 ('respiratory',
  1,
  'Theo dõi AQI trước khi ra ngoài hoặc tập luyện.',
  'Check the AQI before going outdoors or exercising.'),
 ('respiratory',
  2,
  'Giảm thời gian và cường độ hoạt động ngoài trời khi AQI tăng.',
  'Reduce the duration and intensity of outdoor activities when the AQI rises.'),
 ('respiratory',
  3,
  'Tránh hoạt động gần đường lớn, công trường và nguồn khói bụi.',
  'Avoid activities near major roads, construction sites, and sources of smoke or dust.'),
 ('respiratory',
  4,
  'Ưu tiên tập luyện trong nhà khi chất lượng không khí xấu.',
  'Prioritize indoor exercise when air quality is poor.'),
 ('respiratory',
  5,
  'Tuân thủ thuốc và kế hoạch điều trị do bác sĩ hướng dẫn.',
  'Adhere to prescribed medications and treatment plans.'),
 ('respiratory',
  6,
  'Không tự ý tăng liều thuốc chỉ vì AQI cao.',
  'Do not arbitrarily increase medication dosage simply because the AQI is high.'),
 ('respiratory',
  7,
  'Giảm hoặc dừng vận động khi xuất hiện ho, khò khè, tức ngực hoặc khó thở.',
  'Reduce or stop physical activity if coughing, wheezing, chest tightness, or shortness of breath occurs.'),
 ('respiratory',
  8,
  'Tránh khói thuốc lá và các nguồn đốt trong không gian kín.',
  'Avoid tobacco smoke and indoor combustion sources.'),
 ('respiratory',
  9,
  'Khi ozone là chất ô nhiễm chi phối, đặc biệt giảm thời gian và cường độ hoạt động ngoài trời.',
  'When ozone (O3) is the dominant pollutant, individuals with asthma or respiratory diseases should take '
  'extra care to reduce the duration and intensity of outdoor activities.'),
 ('respiratory',
  10,
  'Nếu triệu chứng tăng nặng hoặc không cải thiện, cần khám và tư vấn y tế.',
  'Seek medical consultation if symptoms worsen or do not improve.'),
 ('cardiovascular',
  1,
  'Hạn chế vận động gắng sức ngoài trời khi AQI cao.',
  'Limit strenuous outdoor physical activity when the AQI is high.'),
 ('cardiovascular',
  2,
  'Giảm thời gian ở gần nút giao thông hoặc đường có mật độ xe lớn.',
  'Minimize time spent near traffic intersections or heavily trafficked roads.'),
 ('cardiovascular',
  3,
  'Chọn thời điểm và địa điểm có mức ô nhiễm thấp hơn cho các hoạt động cần thiết.',
  'Choose times and locations with lower pollution levels for essential activities.'),
 ('cardiovascular',
  4,
  'Tuân thủ thuốc điều trị theo hướng dẫn của bác sĩ.',
  'Adhere to prescribed medication regimens.'),
 ('cardiovascular',
  5,
  'Không tự ý ngừng hoặc thay đổi liều thuốc vì chất lượng không khí xấu.',
  'Do not arbitrarily stop taking medication or alter dosages due to poor air quality.'),
 ('cardiovascular',
  6,
  'Theo dõi mệt bất thường, khó thở, hồi hộp hoặc đau/tức ngực.',
  'Monitor for unusual fatigue, shortness of breath, heart palpitations, or chest pain/tightness.'),
 ('cardiovascular',
  7,
  'Khi AQI rất xấu hoặc nguy hại, ưu tiên hoạt động trong nhà.',
  'Prioritize indoor activities when the AQI is "Very Unhealthy" or "Hazardous."'),
 ('cardiovascular',
  8,
  'Tránh khói thuốc và các nguồn khói trong nhà.',
  'Avoid tobacco smoke and indoor sources of smoke.'),
 ('cardiovascular',
  9,
  'Nếu xuất hiện đau/tức ngực, khó thở rõ rệt hoặc triệu chứng tim mạch đáng lo ngại, cần được đánh giá y '
  'tế.',
  'Seek medical evaluation if chest pain/tightness, significant shortness of breath, or concerning '
  'cardiovascular symptoms occur.'),
 ('athletes',
  1,
  'Kiểm tra AQI và dự báo theo giờ trước khi tập.',
  'Check the AQI and hourly forecasts before exercising.'),
 ('athletes',
  2,
  'Khi AQI tăng, giảm thời lượng hoặc cường độ tập luyện.',
  'Reduce the duration or intensity of workouts when the AQI rises.'),
 ('athletes',
  3,
  'Có thể chuyển từ hoạt động nặng sang hoạt động nhẹ hơn để giảm lượng không khí ô nhiễm hít vào.',
  'Consider switching from strenuous to lighter activities to reduce the intake of polluted air.'),
 ('athletes',
  4,
  'Tránh tập luyện sát đường giao thông đông hoặc nguồn phát thải rõ rệt.',
  'Avoid exercising near busy roads or obvious emission sources.'),
 ('athletes',
  5,
  'Ưu tiên tuyến đường ít xe và khu vực ít ô nhiễm hơn nếu có lựa chọn.',
  'Prioritize routes with less traffic and areas with lower pollution levels whenever possible.'),
 ('athletes',
  6,
  'Khi chất lượng không khí xấu, cân nhắc chuyển buổi tập vào trong nhà.',
  'Consider moving workouts indoors when air quality is poor.'),
 ('athletes',
  7,
  'Khi AQI rất xấu hoặc nguy hại, tránh tập luyện cường độ cao ngoài trời.',
  'Avoid high-intensity outdoor exercise when the AQI is "Very Unhealthy" or "Hazardous."'),
 ('athletes',
  8,
  'Nếu xuất hiện ho, tức ngực, khò khè hoặc khó thở, dừng hoặc giảm vận động.',
  'Stop or reduce physical activity if coughing, chest tightness, wheezing, or shortness of breath occurs.'),
 ('athletes',
  9,
  'Duy trì lợi ích của hoạt động thể chất bằng cách thay đổi thời gian, địa điểm hoặc loại hình tập thay vì '
  'cố tập trong điều kiện ô nhiễm cao.',
  'Maintain the benefits of physical activity by adjusting the time, location, or type of exercise rather '
  'than persisting in highly polluted conditions.'),
 ('athletes',
  10,
  'Khi ozone cao, giảm thời gian và cường độ vận động ngoài trời, nhất là với người hen.',
  'Reduce the duration and intensity of outdoor exercise when ozone (O3) levels are high, especially for '
  'individuals with asthma.'),
 ('outdoor_workers',
  1,
  'Theo dõi AQI và dự báo chất lượng không khí trước ca làm việc.',
  'Monitor the AQI and air quality forecasts before starting a shift.'),
 ('outdoor_workers',
  2,
  'Nếu có thể, bố trí công việc nặng vào thời điểm mức ô nhiễm thấp hơn.',
  'If possible, schedule strenuous tasks for times when pollution levels are lower.'),
 ('outdoor_workers',
  3,
  'Giảm thời lượng công việc gắng sức khi AQI cao.',
  'Reduce the duration of strenuous work when the AQI is high.'),
 ('outdoor_workers',
  4,
  'Tăng các khoảng nghỉ ở khu vực ít ô nhiễm hơn.',
  'Increase break times in areas with lower pollution levels.'),
 ('outdoor_workers',
  5,
  'Luân phiên công việc để giảm thời gian phơi nhiễm liên tục.',
  'Rotate tasks to minimize continuous exposure time.'),
 ('outdoor_workers',
  6,
  'Tránh đứng hoặc làm việc trực tiếp cạnh nguồn phát thải khi không cần thiết.',
  'Avoid standing or working directly next to emission sources unless necessary.'),
 ('outdoor_workers',
  7,
  'Sử dụng phương tiện bảo vệ cá nhân phù hợp với đánh giá nguy cơ nghề nghiệp.',
  'Use personal protective equipment appropriate for the occupational risk assessment.'),
 ('outdoor_workers',
  8,
  'Người mắc bệnh tim/phổi cần thận trọng hơn và theo dõi triệu chứng trong ca làm việc.',
  None),
 ('outdoor_workers',
  9,
  'Nếu có khó thở, tức ngực, chóng mặt hoặc triệu chứng bất thường, ngừng gắng sức và tìm nơi có không khí '
  'tốt hơn.',
  None),
 ('outdoor_workers',
  10,
  'Biện pháp bảo vệ cá nhân không thay thế việc kiểm soát nguồn ô nhiễm tại nơi làm việc.',
  None),
 ('families',
  1,
  'Theo dõi AQI hằng ngày để chủ động lịch sinh hoạt của các thành viên nhạy cảm.',
  'Monitor the AQI daily to proactively plan the schedules of vulnerable family members.'),
 ('families',
  2,
  'Khi AQI xấu, ưu tiên không gian trong nhà có mức bụi thấp và ít nguồn khói.',
  'When AQI levels are poor, prioritize indoor areas with low dust levels and minimal sources of smoke.'),
 ('families',
  3,
  'Hạn chế mở cửa trực tiếp ra đường lớn hoặc nguồn phát thải trong thời điểm ô nhiễm nặng.',
  'Avoid opening doors directly facing major roads or emission sources during periods of heavy pollution.'),
 ('families', 4, 'Không hút thuốc trong nhà.', 'Do not smoke indoors.'),
 ('families',
  5,
  'Giảm các hoạt động tạo khói, bụi trong không gian kín.',
  'Minimize activities that generate smoke or dust in enclosed spaces.'),
 ('families',
  6,
  'Chuẩn bị đủ thuốc thường dùng cho người có bệnh nền trong các đợt ô nhiễm kéo dài.',
  'Ensure an adequate supply of regular medications for individuals with underlying health conditions during '
  'prolonged pollution episodes.'),
 ('families',
  7,
  'Theo dõi triệu chứng hô hấp và tim mạch của thành viên nhạy cảm.',
  'Monitor vulnerable family members for respiratory and cardiovascular symptoms.'),
 ('families',
  8,
  'Nếu chất lượng không khí trong nhà không tốt, "ở trong nhà" không bảo đảm giảm phơi nhiễm; cần đồng thời '
  'kiểm soát nguồn ô nhiễm trong nhà.',
  'If indoor air quality is poor, simply staying indoors does not guarantee reduced exposure; indoor '
  'pollution sources must also be controlled.')]

SOURCES = [('S1',
  'Air Quality Guidelines: Global Update',
  'World Health Organization (WHO)',
  2021,
  'https://www.who.int/publications/i/item/9789240034228'),
 ('S2',
  'Air Quality and Health',
  'US Environmental Protection Agency (EPA)',
  2023,
  'https://www.epa.gov/air-research/air-quality-and-health'),
 ('S3',
  'Hướng dẫn dự phòng và bảo vệ sức khỏe mùa ô nhiễm không khí',
  'Bộ Y tế Việt Nam',
  2023,
  'https://moh.gov.vn'),
 ('S4', 'Guidance on Air Pollution and Children Health', 'UNICEF / WHO', 2022, 'https://www.unicef.org'),
 ('S5',
  'Asthma and Outdoor Air Pollution Management',
  'Global Initiative for Asthma (GINA)',
  2023,
  'https://ginasthma.org'),
 ('S6',
  'Air Pollution and Cardiovascular Disease',
  'American Heart Association (AHA)',
  2020,
  'https://www.ahajournals.org'),
 ('S7',
  'Protecting Outdoor Workers from Air Pollution Hazards',
  'Occupational Safety and Health Administration (OSHA)',
  2022,
  'https://www.osha.gov'),
 ('S8', 'Indoor Air Quality and Vulnerable Populations', 'Clean Air Asia', 2023, 'https://cleanairasia.org')]

TOPIC_SOURCES = [('children', 'S1'),
 ('children', 'S2'),
 ('children', 'S3'),
 ('children', 'S4'),
 ('pregnant', 'S1'),
 ('pregnant', 'S4'),
 ('pregnant', 'S6'),
 ('elderly', 'S1'),
 ('elderly', 'S2'),
 ('elderly', 'S4'),
 ('respiratory', 'S1'),
 ('respiratory', 'S2'),
 ('respiratory', 'S3'),
 ('respiratory', 'S4'),
 ('respiratory', 'S8'),
 ('cardiovascular', 'S1'),
 ('cardiovascular', 'S2'),
 ('cardiovascular', 'S4'),
 ('cardiovascular', 'S6'),
 ('athletes', 'S3'),
 ('athletes', 'S4'),
 ('athletes', 'S5'),
 ('athletes', 'S8'),
 ('outdoor_workers', 'S1'),
 ('outdoor_workers', 'S4'),
 ('outdoor_workers', 'S5'),
 ('families', 'S1'),
 ('families', 'S2'),
 ('families', 'S4'),
 ('families', 'S5')]


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        text("""
            INSERT INTO advice_topics
                (slug, topic_type, title_vi, title_en, icon_key, risk_level, display_order)
            VALUES
                (:slug, :topic_type, :title_vi, :title_en, :icon_key, :risk_level, :display_order)
            ON CONFLICT (slug) DO NOTHING
        """),
        [dict(zip(("slug", "topic_type", "title_vi", "title_en", "icon_key", "risk_level", "display_order"), row)) for row in TOPICS],
    )
    connection.execute(
        text("""
            UPDATE advice_topics SET title_en = :title_en
            WHERE slug = :slug AND title_en IS NULL
        """),
        [dict(zip(("slug", "title_en"), row)) for row in TOPIC_TITLES_EN],
    )
    # Add only missing slots so existing customized advice is preserved.
    connection.execute(
        text("""
            INSERT INTO advice_items (topic_id, content_vi, content_en, sort_order)
            SELECT t.id, :content_vi, :content_en, :sort_order
            FROM advice_topics AS t
            WHERE t.slug = :slug
              AND NOT EXISTS (
                  SELECT 1 FROM advice_items AS i
                  WHERE i.topic_id = t.id AND i.sort_order = :sort_order
              )
        """),
        [dict(zip(("slug", "sort_order", "content_vi", "content_en"), row)) for row in ITEMS],
    )
    connection.execute(
        text("""
            UPDATE advice_items AS i
            SET content_en = :content_en
            FROM advice_topics AS t
            WHERE i.topic_id = t.id AND t.slug = :slug
              AND i.sort_order = :sort_order AND i.content_en IS NULL
              AND CAST(:content_en AS TEXT) IS NOT NULL
        """),
        [dict(zip(("slug", "sort_order", "content_en"), (row[0], row[1], row[3]))) for row in ITEMS],
    )
    connection.execute(
        text("""
            INSERT INTO advice_sources (code, title, publisher, published_year, url)
            VALUES (:code, :title, :publisher, :published_year, :url)
            ON CONFLICT (code) DO NOTHING
        """),
        [dict(zip(("code", "title", "publisher", "published_year", "url"), row)) for row in SOURCES],
    )
    connection.execute(
        text("""
            INSERT INTO advice_topic_sources (topic_id, source_id)
            SELECT t.id, s.id FROM advice_topics AS t
            JOIN advice_sources AS s ON s.code = :code
            WHERE t.slug = :slug
            ON CONFLICT DO NOTHING
        """),
        [dict(zip(("slug", "code"), row)) for row in TOPIC_SOURCES],
    )
    connection.exec_driver_sql(
        """
        DO $migration$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'uq_advice_items_topic_sort'
            ) AND NOT EXISTS (
                SELECT 1 FROM advice_items
                GROUP BY topic_id, sort_order
                HAVING COUNT(*) > 1
            ) THEN
                ALTER TABLE advice_items
                    ADD CONSTRAINT uq_advice_items_topic_sort
                    UNIQUE (topic_id, sort_order);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'chk_advice_topics_risk_level'
            ) AND NOT EXISTS (
                SELECT 1 FROM advice_topics
                WHERE risk_level NOT IN ('low', 'moderate', 'high', 'critical')
            ) THEN
                ALTER TABLE advice_topics
                    ADD CONSTRAINT chk_advice_topics_risk_level
                    CHECK (risk_level IN ('low', 'moderate', 'high', 'critical'));
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'chk_advice_topics_type'
            ) AND NOT EXISTS (
                SELECT 1 FROM advice_topics
                WHERE topic_type NOT IN ('target_group', 'situation', 'pollutant', 'symptom')
            ) THEN
                ALTER TABLE advice_topics
                    ADD CONSTRAINT chk_advice_topics_type
                    CHECK (topic_type IN ('target_group', 'situation', 'pollutant', 'symptom'));
            END IF;
        END;
        $migration$
        """
    )
    connection.exec_driver_sql(
        "CREATE INDEX IF NOT EXISTS idx_advice_topic_sources_source_id ON advice_topic_sources (source_id)"
    )


def downgrade() -> None:
    # This revision seeds shared content and may have filled gaps in pre-existing
    # rows. Keep it on downgrade to avoid deleting user-authored or edited advice.
    pass
