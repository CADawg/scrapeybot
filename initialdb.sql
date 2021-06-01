--
-- Table structure for table `indexed`
--

CREATE TABLE `indexed` (
  `id` bigint(20) NOT NULL,
  `url` text COLLATE utf8mb4_bin NOT NULL,
  `title` tinytext COLLATE utf8mb4_bin DEFAULT NULL,
  `description` tinytext COLLATE utf8mb4_bin DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------

--
-- Table structure for table `unindexed`
--

CREATE TABLE `unindexed` (
  `id` bigint(20) NOT NULL,
  `link` text COLLATE utf8mb4_bin NOT NULL,
  `parent` int(11) DEFAULT NULL,
  `failed` tinyint(1) NOT NULL DEFAULT 0,
  `unindexable` tinyint(1) NOT NULL DEFAULT 0,
  `alreadyindexed` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

--
-- Dumping data for table `unindexed`
--

INSERT INTO `unindexed` (`id`, `link`, `parent`, `failed`, `unindexable`, `alreadyindexed`) VALUES
(1, 'https://nftm.art/', NULL, 0, 0, 0);
